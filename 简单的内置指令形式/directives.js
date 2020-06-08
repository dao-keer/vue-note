module.exports = {
    text: function (el, value) {
        // sd-text的update回调函数，更改dom的文本类容
        el.textContent = value || ''
    },
    show: function (el, value) {
        // sd-show的update回调函数，更改dom的显示和隐藏
        el.style.display = value ? '' : 'none'
    },
    class: function (el, value, classname) {
        el.classList[value ? 'add' : 'remove'](classname)
        console.log(el.classList)
    },
    on: {
        update: function (el, handler, event, directive) {
            console.log('event update')
            if (!directive.handlers) {
                directive.handlers = {}
            }
            var handlers = directive.handlers
            if (handlers[event]) {
                el.removeEventListener(event, handlers[event])
            }
            if (handler) {
                handler = handler.bind(el)
                // 此时注册的事件，是经过customFilter闭包产生的函数
                el.addEventListener(event, handler)
                handlers[event] = handler
            }
        },
        unbind: function (el, event, directive) {
            if (directive.handlers) {
                el.removeEventListener(event, directive.handlers[event])
            }
        },
        customFilter: function (handler, selectors) {
            console.log('customFilter init')
            // 这里的事件处理利用了冒泡机制，所以需要确定是否是指定的元素触发了事件
            return function (e) {
                console.log('检测事件源')
                var match = selectors.every(function (selector) {
                    return e.target.webkitMatchesSelector(selector)
                })
                if (match) handler.apply(this, arguments)
            }
        }
    }
}