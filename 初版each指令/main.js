var config     = require('./config'),
    Seed       = require('./seed'),
    directives = require('./directives'),
    filters    = require('./filters')

Seed.config = config

Seed.extend = function (opts) {
    var Spore = function () {
        // 用Spore实例对象的this去执行Seed函数，就拥有类似下面的scope等属性
        Seed.apply(this, arguments)
        for (var prop in this.extensions) {
            var ext = this.extensions[prop]
            // 将扩展的对象挂载到scope上
            this.scope[prop] = (typeof ext === 'function')
                ? ext.bind(this)
                : ext
        }
    }
    Spore.prototype = Object.create(Seed.prototype)
    // 将需要扩展的对象挂载到Spore.prototype.extensions上
    Spore.prototype.extensions = {}
    for (var prop in opts) {
        Spore.prototype.extensions[prop] = opts[prop]
    }
    return Spore
}

// 添加新指令
Seed.directive = function (name, fn) {
    directives[name] = fn
}

// 扩展过滤器
Seed.filter = function (name, fn) {
    filters[name] = fn
}

module.exports = Seed
