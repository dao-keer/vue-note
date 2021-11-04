import { def } from '../util/index'

const arrayProto = Array.prototype
// 创建新的数组对象，原型指向原始数组构造函数的原型
export const arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */

;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  var original = arrayProto[method]
  def(arrayMethods, method, function mutator () {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    // 将参数处理成数组，方便后面做数据观测
    var i = arguments.length
    var args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }
    // 先调用原始的数组方法，得到结果
    var result = original.apply(this, args)
    // 获取当前数组的Observer观察者实例
    var ob = this.__ob__
    var inserted
    switch (method) {
      case 'push':
        inserted = args
        break
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    // 如果是要添加新的元素，要对新的元素进行观测操作
    if (inserted) ob.observeArray(inserted)
    // notify change，观察者实例给订阅者发布更新通知
    ob.dep.notify()
    return result
  })
})

/**
 * Swap the element at the given index with a new value
 * and emits corresponding event.
 *
 * @param {Number} index
 * @param {*} val
 * @return {*} - replaced element
 */
// 自定义#set方法
def(
  arrayProto,
  '$set',
  function $set (index, val) {
    if (index >= this.length) {
      this.length = Number(index) + 1
    }
    return this.splice(index, 1, val)[0]
  }
)

/**
 * Convenience method to remove the element at given index or target element reference.
 *
 * @param {*} item
 */
// 自定义remove方法
def(
  arrayProto,
  '$remove',
  function $remove (item) {
    /* istanbul ignore if */
    if (!this.length) return
    var index = this.indexOf(item)
    if (index > -1) {
      return this.splice(index, 1)
    }
  }
)
