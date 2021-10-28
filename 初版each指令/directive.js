var config     = require('./config'),
    Directives = require('./directives'),
    Filters    = require('./filters')

var KEY_RE          = /^[^\|]+/,// 匹配绑定的属性
    // 匹配过滤器
    FILTERS_RE      = /\|[^\|]+/g,
    // 分离过滤器和参数
    FILTER_TOKEN_RE = /[^\s']+|'[^']+'/g,
    QUOTE_RE        = /'/g

function Directive (def, attr, arg, key) {
    // 挂载更新方法
    if (typeof def === 'function') {
        this._update = def
    } else {
        for (var prop in def) {
            if (prop === 'update') {
                this['_update'] = def.update
                continue
            }
            this[prop] = def[prop]
        }
    }

    this.attr = attr
    this.arg  = arg
    this.key  = key
    
    var filters = attr.value.match(FILTERS_RE)
    if (filters) {
        this.filters = filters.map(function (filter) {
            var tokens = filter.slice(1)
                .match(FILTER_TOKEN_RE)
                .map(function (token) {
                    return token.replace(QUOTE_RE, '').trim()
                })
            return {
                name  : tokens[0], // 过滤器名称
                apply : Filters[tokens[0]], // 过滤器处理函数
                args  : tokens.length > 1 // 过滤器的参数
                        ? tokens.slice(1)
                        : null
            }
        })
    }
}

Directive.prototype.update = function (value) {
    // apply filters
    if (this.filters) {
        // 如果是事件，返回一个处理函数，用于绑定到dom，更新数据
        // 如果是属性，直接返回一个处理后的值
        value = this.applyFilters(value)
    }
    // 绑定事件或者是更新值
    this._update(value)
}

Directive.prototype.applyFilters = function (value) {
    var filtered = value
    this.filters.forEach(function (filter) {
        if (!filter.apply) throw new Error('Unknown filter: ' + filter.name)
        filtered = filter.apply(filtered, filter.args)
    })
    return filtered
}

module.exports = {

    // make sure the directive and value is valid
    parse: function (attr) {

        var prefix = config.prefix
        if (attr.name.indexOf(prefix) === -1) return null

        var noprefix = attr.name.slice(prefix.length + 1),
            argIndex = noprefix.indexOf('-'),
            arg = argIndex === -1
                ? null
                : noprefix.slice(argIndex + 1),
            name = arg
                ? noprefix.slice(0, argIndex)
                : noprefix,
            def = Directives[name]

        var key = attr.value.match(KEY_RE)

        return def && key
            ? new Directive(def, attr, arg, key[0].trim())
            : null
    }
}