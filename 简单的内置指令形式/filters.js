module.exports = {
    capitalize: function (value) {
        // 首字母大写过滤器
        value = value.toString()
        return value.charAt(0).toUpperCase() + value.slice(1)
    }
}