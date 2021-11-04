import Dep from './dep'
import { arrayMethods } from './array'
import {
  def,
  isArray,
  isPlainObject,
  hasProto,
  hasOwn
} from '../util/index'

// 自定义的数组方法集合
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However in certain cases, e.g.
 * v-for scope alias and props, we don't want to force conversion
 * because the value may be a nested value under a frozen data structure.
 *
 * So whenever we want to set a reactive property without forcing
 * conversion on the new value, we wrap that call inside this function.
 */

let shouldConvert = true
export function withoutConversion (fn) {
  shouldConvert = false
  fn()
  shouldConvert = true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 *
 * @param {Array|Object} value
 * @constructor
 */

export function Observer (value) {
  // 观察者实例对象上有value，和dep依赖管理器
  this.value = value
  this.dep = new Dep()
  // value上挂载它对应的观察者实例对象，observe方法调用时会用到
  def(value, '__ob__', this)
  if (isArray(value)) {
    var augment = hasProto
      ? protoAugment
      : copyAugment
    augment(value, arrayMethods, arrayKeys)
    // 如果数组上有原型方法，则改写数组的原型到arrayKeys，这是改动过的
    // 如果没有原型，直接将arrayKeys的方法添加到数组的属性上，作为属性方法调用
    // 开始观测数组对象
    this.observeArray(value)
  } else {
    // 观测对象
    this.walk(value)
  }
}

// Instance methods

/**
 * Walk through each property and convert them into
 * getter/setters. This method should only be called when
 * value type is Object.
 *
 * @param {Object} obj
 */

Observer.prototype.walk = function (obj) {
  var keys = Object.keys(obj)
  for (var i = 0, l = keys.length; i < l; i++) {
    this.convert(keys[i], obj[keys[i]])
  }
}

/**
 * Observe a list of Array items.
 *
 * @param {Array} items
 */

Observer.prototype.observeArray = function (items) {
  for (var i = 0, l = items.length; i < l; i++) {
    // 挨个观测数组的每一项元素
    observe(items[i])
  }
}

/**
 * Convert a property into getter/setter so we can emit
 * the events when the property is accessed/changed.
 *
 * @param {String} key
 * @param {*} val
 */

Observer.prototype.convert = function (key, val) {
  defineReactive(this.value, key, val)
}

/**
 * Add an owner vm, so that when $set/$delete mutations
 * happen we can notify owner vms to proxy the keys and
 * digest the watchers. This is only called when the object
 * is observed as an instance's root $data.
 *
 * @param {Vue} vm
 */

Observer.prototype.addVm = function (vm) {
  (this.vms || (this.vms = [])).push(vm)
}

/**
 * Remove an owner vm. This is called when the object is
 * swapped out as an instance's $data object.
 *
 * @param {Vue} vm
 */

Observer.prototype.removeVm = function (vm) {
  this.vms.$remove(vm)
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 *
 * @param {Object|Array} target
 * @param {Object} src
 */

function protoAugment (target, src) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * @param {Object|Array} target
 * @param {Object} proto
 */

function copyAugment (target, src, keys) {
  for (var i = 0, l = keys.length; i < l; i++) {
    var key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *
 * @param {*} value
 * @param {Vue} [vm]
 * @return {Observer|undefined}
 * @static
 */

export function observe (value, vm) {
  if (!value || typeof value !== 'object') {
    // 不是对象或者是假值，直接返回
    return
  }
  var ob
  if (
    hasOwn(value, '__ob__') &&
    value.__ob__ instanceof Observer
  ) {
    // 如果要观测的value已经有观察者实例对象了，就直接赋值
    ob = value.__ob__
  } else if (
    shouldConvert &&
    (isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 如果是可扩展的数组或者是对象，开始生成观察者实例
    ob = new Observer(value)
  }
  if (ob && vm) {
    ob.addVm(vm)
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 *
 * @param {Object} obj 当前完整的对象
 * @param {String} key 当前对象对应的某个key
 * @param {*} val      当前对象对应的某个key，这个key对应的value
 */

export function defineReactive (obj, key, val) {
  // 新建依赖管理器
  var dep = new Dep()

  // 如果对象不可更改，则跳过
  var property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  var getter = property && property.get
  var setter = property && property.set

  var childOb = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 这里为啥是getter.call(obj)
      var value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // watcher实例创建好了，就把属性对应的dep实例添加到watcher实例的newDeps数组中去
        // 反向的也把watcher的实例添加到了当前dep实例的subs数组中去了（这个目的是啥？）
        dep.depend()
        if (childOb) {
          // 如果值是个数组或者对象，将孩子的dep实例也添加到watcher实例的newDeps数组中去
          childOb.dep.depend()
        }
        if (isArray(value)) {
          for (var e, i = 0, l = value.length; i < l; i++) {
            e = value[i]
            // 如果vuale是数组，看下数组每一项是否还有dep实例，如果有，都要加到watcher实例的newDeps数组中去
            e && e.__ob__ && e.__ob__.dep.depend()
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      var value = getter ? getter.call(obj) : val
      if (newVal === value) {
        return
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 新的值，也要重新添加观测
      childOb = observe(newVal)
      // 依赖管理器通知watcher去更新dom
      dep.notify()
    }
  })
}
