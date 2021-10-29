var config = require('./config'),
    watchArray = require('./watchArray')

module.exports = {

    text: function (value) {
        this.el.textContent = value || ''
    },

    show: function (value) {
        this.el.style.display = value ? '' : 'none'
    },

    class: function (value) {
        this.el.classList[value ? 'add' : 'remove'](this.arg)
    },

    on: {
        update: function (handler) {
            var event = this.arg
            if (this.handler) {
                this.el.removeEventListener(event, this.handler)
            }
            if (handler) {
                this.el.addEventListener(event, handler)
                this.handler = handler
            }
        },
        unbind: function () {
            var event = this.arg
            if (this.handlers) {
                this.el.removeEventListener(event, this.handlers[event])
            }
        }
    },

    each: {
        bind: function () {
            // 这里很巧妙的删除了sd-each，防止在self.scope[binding.key] = self._dataCopy[binding.key]这里
            // 触发update时，然后进而触发buildItem，去遍历编译新的循环节点时再次进入eachExp分支
            this.el.removeAttribute(config.prefix + '-each')
            this.prefixRE = new RegExp('^' + this.arg + '.')
            var ctn = this.container = this.el.parentNode
            this.marker = document.createComment('sd-each-' + this.arg + '-marker')
            ctn.insertBefore(this.marker, this.el)
            ctn.removeChild(this.el)
            this.childSeeds = []
        },
        update: function (collection) {
            if (this.childSeeds.length) {
                this.childSeeds.forEach(function (child) {
                    child.destroy()
                })
                this.childSeeds = []
            }
            watchArray(collection, this.mutate.bind(this))
            var self = this
            collection.forEach(function (item, i) {
                self.childSeeds.push(self.buildItem(item, i, collection))
            })
            console.log('collection creation done.')
        },
        mutate: function (mutation) {
            console.log(mutation)
        },
        buildItem: function (data, index, collection) {
            var Seed = require('./seed'),
                node = this.el.cloneNode(true)
            var spore = new Seed(node, data, {
                    eachPrefixRE: this.prefixRE,
                    parentSeed: this.seed
                })
            this.container.insertBefore(node, this.marker)
            collection[index] = spore.scope
            return spore
        }
    }

}