var prefix = 'sd',
    Filters = require('./filters'),
    Directives = require('./directives'),
    // 根据指令集来拼接自定义属性字符串，用来查找带有vue指令的dom类数组
    selector = Object.keys(Directives).map(function (d) {
        return '[' + prefix + '-' + d + ']'
    }).join()

function Seed(opts) {

    var self = this,
        // 缓存根节点dom
        root = this.el = document.getElementById(opts.id),
        // 查找所有带vue指令的dom
        els = root.querySelectorAll(selector),
        // 收集双向绑定的变量
        bindings = {} // internal real data
    // 当前实例下的变量集合
    self.scope = {} // external interface

        // process nodes for directives
        ;[].forEach.call(els, processNode)
    processNode(root)

    // initialize all variables by invoking setters
    for (var key in bindings) {
        self.scope[key] = opts.scope[key]
    }

    function processNode(el) {
        // 格式化每个包含vue指令的dom的属性集合
        cloneAttributes(el.attributes).forEach(function (attr) {
            // 针对每个属性，生成一个指令对象
            var directive = parseDirective(attr)
            // 如果该指令是内置的，就开始做双向绑定操作
            if (directive) {
                bindDirective(self, el, bindings, directive)
            }
        })
    }
}

// clone attributes so they don't change
// 对每个包含vue指令的dom进行属性收集
function cloneAttributes(attributes) {
    return [].map.call(attributes, function (attr) {
        return {
            name: attr.name,
            value: attr.value
        }
    })
}

function bindDirective(seed, el, bindings, directive) {
    // 删除vue的自定义指令
    el.removeAttribute(directive.attr.name)
    var key = directive.key,
        binding = bindings[key]
    // 如果bindings对象上没有对应key的值，则构建该值
    // 包含该变量对应的value，和directives（用来存储跟该变量相关的指令对象）    
    if (!binding) {
        bindings[key] = binding = {
            value: undefined,
            directives: []
        }
    }
    directive.el = el
    binding.directives.push(directive)
    // invoke bind hook if exists
    if (directive.bind) {
        directive.bind(el, binding.value)
    }
    if (!seed.scope.hasOwnProperty(key)) {
        // 如果当前实列的scope对象上没有该变量，则开始双向绑定处理
        bindAccessors(seed, key, binding)
    }
}

function bindAccessors(seed, key, binding) {
    Object.defineProperty(seed.scope, key, {
        get: function () {
            // 取值直接从binding的value属性上获取
            return binding.value
        },
        set: function (value) {
            // 赋值时，也同步到binding的value属性上，确保一定是最新值
            binding.value = value
            // 赋值时，变量相关的所有的指令对象里的update回调都要挨个执行一次，确保dom上的值发生更改
            binding.directives.forEach(function (directive) {
                if (value && directive.filters) {
                    // 如果value本身是个假值，这里的if分支就有bug
                    value = applyFilters(value, directive)
                }
                directive.update(
                    directive.el,
                    value,
                    directive.argument,
                    directive,
                    seed
                )
            })
        }
    })
}

function parseDirective(attr) {
    // 如果不是vue相关的指令属性，不处理
    if (attr.name.indexOf(prefix) === -1) return

    // parse directive name and argument
    var noprefix = attr.name.slice(prefix.length + 1),
        argIndex = noprefix.indexOf('-'),
        dirname = argIndex === -1
            ? noprefix
            : noprefix.slice(0, argIndex),
        // 找到对应的内置指令
        def = Directives[dirname],
        arg = argIndex === -1
            ? null
            : noprefix.slice(argIndex + 1)

    // parse scope variable key and pipe filters
    var exp = attr.value,
        pipeIndex = exp.indexOf('|'),
        key = pipeIndex === -1
            ? exp.trim()
            : exp.slice(0, pipeIndex).trim(),
        // 生成需要作用的过滤器
        filters = pipeIndex === -1
            ? null
            : exp.slice(pipeIndex + 1).split('|').map(function (filter) {
                return filter.trim()
            })
    // 如果是内置指令，就返回组合成的指令对象
    return def
        ? {
            // 当前的属性map
            attr: attr,
            // 当前指令绑定的变量
            key: key,
            // 当前引用的过滤器
            filters: filters,
            // 内置指令
            definition: def,
            // 内置指令更新函数所需要的参数
            argument: arg,
            // 更新函数
            update: typeof def === 'function'
                ? def
                : def.update
        }
        : null
}

function applyFilters(value, directive) {
    if (directive.definition.customFilter) {
        // 如果是事件类型的，这里的value是个函数名称
        return directive.definition.customFilter(value, directive.filters)
    } else {
        directive.filters.forEach(function (filter) {
            if (Filters[filter]) {
                value = Filters[filter](value)
            }
        })
        return value
    }
}

module.exports = {
    create: function (opts) {
        return new Seed(opts)
    },
    filters: Filters,
    directives: Directives
}