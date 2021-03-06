import { Dependencies } from 'constitute';
import EventEmitter from 'events';
import camelCase from 'lodash/camelCase';
import { RuntimeException } from '../exceptions';
import Logger from './logger';
import ServiceInterface from './interface';

/**
 * A strict version of EventEmitter
 * 1. listener must be a standard class
 * 2. unregistered event not allow to emit
 * 3. all events register and trigger will be recorded
 */
@Dependencies(Logger) //eslint-disable-line new-cap
export default class EventManager extends ServiceInterface {
  constructor(logger) {
    super();
    this.logger = logger;
    this.emitter = new EventEmitter();
    this.events = new Set();
  }

  getProto() {
    return EventEmitter;
  }

  getAllowEvents() {
    return this.events;
  }

  getEmitter() {
    //TODO: 屏蔽写入
    return this.emitter;
  }

  /**
   * Allow to register a class such like
   * class Foo { get prefix(){ return 'foo'} get actions() { return ['bar']} }
   * @param ListenerClass
   * @returns {EventManager}
   */
  addListener(ListenerClass) {
    if (typeof ListenerClass !== 'function') {
      throw new RuntimeException('Not a standard listener input');
    }
    const listener = new ListenerClass();
    const { prefix, actions } = listener;
    if (!prefix || !actions) {
      throw new RuntimeException('Not a standard listener input');
    }

    const events = {};
    const eventsCount = this.events.size;
    for (const action of actions) {
      events[[prefix, action, 'before'].join(':')] = camelCase(['before', action].join('_'));
      events[[prefix, action, 'after'].join(':')] = camelCase(['after', action].join('_'));
    }

    //TODO: 用Set保存注册的事件
    for (const [eventName, callback] of Object.entries(events)) {
      this.events.add(eventName);
      if (Reflect.has(listener, callback) === false) {
        continue;
      }
      this.emitter.addListener(eventName, listener[callback]);
    }

    if (eventsCount + Object.keys(events).length !== this.events.size) {
      throw new RuntimeException('Repeated event name has been registered, please check');
    }

    // this.logger.debug('Registered events', this.emitter.eventNames());
    return this;
  }

  emit(eventName, callback) {
    if (!this.events.has(eventName)) {
      throw new RuntimeException(`Event ${eventName} not registered yet`);
    }
    return this.emitter.emit(eventName, callback);
  }
}
