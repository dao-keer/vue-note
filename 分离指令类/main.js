var prefix      = 'sd',
    Directive   = require('./directive'),
    Directives  = require('./directives'),
    // 生成需要处理的指令集合
    selector    = Object.keys(Directives).map(function (d) {
        return '[' + prefix + '-' + d + ']'
    }).join()

function Seed (opts) {

    var self = this,
        root = this.el = document.getElementById(opts.id),
        els  = root.querySelectorAll(selector)

    self.bindings = {}
    self.scope = {}

    // process nodes for directives
    // 此处对象和方法分离了，所以在执行时需要动态绑定this，以便能调用bind
    ;[].forEach.call(els, this.compileNode.bind(this))
    this.compileNode(root)

    // initialize all variables by invoking setters
    for (var key in self.bindings) {
        // 利用变量初始化，出发setter函数，添加响应式监听
        self.scope[key] = opts.scope[key]
    }

}

Seed.prototype.compileNode = function (node) {
    var self = this
    cloneAttributes(node.attributes).forEach(function (attr) {
        var directive = Directive.parse(attr, prefix)
        if (directive) {
            self.bind(node, directive)
        }
    })
}

Seed.prototype.bind = function (node, directive) {
    // 方便后面使用this.el
    directive.el = node
    node.removeAttribute(directive.attr.name)

    var key      = directive.key,
        // 确保响应式的监听只执行一次
        binding  = this.bindings[key] || this.createBinding(key)

    // add directive to this binding，把需要更新的对象存储到key对应的directives里面
    binding.directives.push(directive)

    // invoke bind hook if exists
    if (directive.bind) {
        directive.bind(node, binding.value)
    }

}

Seed.prototype.createBinding = function (key) {

    var binding = {
        value: undefined,
        directives: []
    }

    this.bindings[key] = binding

    // bind accessor triggers to scope
    Object.defineProperty(this.scope, key, {
        get: function () {
            return binding.value
        },
        set: function (value) {
            binding.value = value
            binding.directives.forEach(function (directive) {
                // 更新时，依次调用binding里directives里的更新方法
                directive.update(value)
            })
        }
    })

    return binding
}

Seed.prototype.dump = function () {
    var data = {}
    for (var key in this._bindings) {
        data[key] = this._bindings[key].value
    }
    return data
}

Seed.prototype.destroy = function () {
    for (var key in this._bindings) {
        this._bindings[key].directives.forEach(unbind)
    }
    this.el.parentNode.remove(this.el)
    function unbind (directive) {
        if (directive.unbind) {
            directive.unbind()
        }
    }
}

// clone attributes so they don't change
function cloneAttributes (attributes) {
    return [].map.call(attributes, function (attr) {
        return {
            name: attr.name,
            value: attr.value
        }
    })
}

module.exports = {
    create: function (opts) {
        return new Seed(opts)
    },
    directive: function () {
        // create dir
    },
    filter: function () {
        // create filter
    }
}