var config        = require('./config'),
    controllers   = require('./controllers'),
    bindingParser = require('./binding')

var map  = Array.prototype.map,
    each = Array.prototype.forEach

// lazy init
var ctrlAttr,
    eachAttr

function Seed (el, data, options) {

    // refresh
    ctrlAttr = config.prefix + '-controller'
    eachAttr = config.prefix + '-each'

    if (typeof el === 'string') {
        el = document.querySelector(el)
    }

    this.el         = el
    this.scope      = data
    this._bindings  = {}
    this._options   = options || {}

    var key
    // keep a temporary copy for all the real data
    // so we can overwrite the passed in data object
    // with getter/setters.
    this._dataCopy = {} // 编译子节点的指令时需要用到里面的值，去做初始化操作触发update
    for (key in data) {
        this._dataCopy[key] = data[key]
    }

    // if has controller
    var ctrlID = el.getAttribute(ctrlAttr),
        controller = null
    if (ctrlID) {
        controller = controllers[ctrlID]
        // 控制器的指令用过一次后就删除，防止多次执行
        el.removeAttribute(ctrlAttr)
        if (!controller) throw new Error('controller ' + ctrlID + ' is not defined.')
    }

    // process nodes for directives
    // first, child with sd-each directive
    
    this._compileNode(el, true)

    // initialize all variables by invoking setters
    for (key in this._dataCopy) {
        this.scope[key] = this._dataCopy[key]
    }
    delete this._dataCopy

    // copy in methods from controller，对应控制器上的方法要绑定作用域
    if (controller) {
        controller.call(null, this.scope, this)
    }
}

Seed.prototype._compileNode = function (node, root) {
    var self = this

    if (node.nodeType === 3) { // text node

        self._compileTextNode(node)

    } else if (node.attributes && node.attributes.length) {

        var eachExp = node.getAttribute(eachAttr),
            ctrlExp = node.getAttribute(ctrlAttr)

        if (eachExp) { // each block each指令的权重高

            var binding = bindingParser.parse(eachAttr, eachExp)
            if (binding) {
                self._bind(node, binding)
                // need to set each block now so it can inherit
                // parent scope. i.e. the childSeeds must have been
                // initiated when parent scope setters are invoked
                // 触发list的循环创建
                self.scope[binding.key] = self._dataCopy[binding.key]
                // 这里删除todos没看懂，但是不删掉会报错
                delete self._dataCopy[binding.key]
            }

        } else if (!ctrlExp || root) { // normal node (non-controller)

            if (node.childNodes.length) {
                each.call(node.childNodes, function (child) {
                    self._compileNode(child)
                })
            }

            // clone attributes because the list can change
            var attrs = map.call(node.attributes, function (attr) {
                return {
                    name: attr.name,
                    expressions: attr.value.split(',')
                }
            })
            attrs.forEach(function (attr) {
                var valid = false
                attr.expressions.forEach(function (exp) {
                    var binding = bindingParser.parse(attr.name, exp)
                    if (binding) {
                        valid = true
                        self._bind(node, binding)
                    }
                })
                if (valid) node.removeAttribute(attr.name)
            })
        }
    }
}

Seed.prototype._compileTextNode = function (node) {
    return node
}

Seed.prototype._bind = function (node, bindingInstance) {

    bindingInstance.seed = this
    bindingInstance.el = node

    var key = bindingInstance.key,
        epr = this._options.eachPrefixRE,
        isEachKey = epr && epr.test(key),
        scopeOwner = this
    // TODO make scope chain work on nested controllers
    if (isEachKey) {
        // 如果是子域上的属性，就在子域的_bindings上操作
        key = key.replace(epr, '')
    } else if (epr) {
        // 如果表达式没在当前的scope上找到，就去把作用域改到父作用域，变化就能通知到对应的bindingInstance
        scopeOwner = this._options.parentSeed
    }

    var binding = scopeOwner._bindings[key] || scopeOwner._createBinding(key)

    // add directive to this binding
    binding.instances.push(bindingInstance)

    // invoke bind hook if exists
    if (bindingInstance.bind) {
        // 走完一次sd-each，这个bind也不会走了，sd-each指令remove掉了
        bindingInstance.bind(binding.value)
    }

}

Seed.prototype._createBinding = function (key) {

    var binding = {
        value: null,
        instances: []
    }

    this._bindings[key] = binding
    // bind accessor triggers to scope
    console.log('start key', key)
    Object.defineProperty(this.scope, key, {
        get: function () {
            return binding.value
        },
        set: function (value) {
            binding.value = value
            binding.instances.forEach(function (instance) {
                instance.update(value)
            })
        }
    })
    console.log(this, this.scope)

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
        this._bindings[key].instances.forEach(unbind)
        ;delete this._bindings[key]
    }
    this.el.parentNode.removeChild(this.el)
    function unbind (instance) {
        if (instance.unbind) {
            instance.unbind()
        }
    }
}

module.exports = Seed