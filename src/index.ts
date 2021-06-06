import { EventEmitter } from 'events'
import { Redis } from 'ioredis'
import { Packr, Unpackr } from 'msgpackr'
import { Options as PackrOptions } from 'msgpackr/unpack'

export interface Options {
  connection: Redis,
  prefix?: string,
  msgpackr?: PackrOptions,
}

export interface EventListener {
  (data: any): void
}

export default class GlobalEvents extends EventEmitter {
  public readonly prefix: string = 'global-'

  private readonly subscriptions = new Set<string>()
  private readonly connection: Redis
  private readonly subscriber: Redis
  private readonly packr: Packr
  private readonly unpackr: Unpackr

  public constructor(opts: Options) {
    super()

    this.connection = opts.connection
    this.subscriber = opts.connection.duplicate()
    this.packr = new Packr(opts.msgpackr)
    this.unpackr = new Unpackr(opts.msgpackr)

    if (opts.prefix) {
      this.prefix = this.prefix
    }

    this.subscriber.on('messageBuffer', (channelBuf: Buffer, messageBuf: Buffer) => {
      const channel = channelBuf.toString('utf-8')
      const event = channel.substring(this.prefix.length + 7)
      super.emit(event, this.unpackr.unpack(messageBuf))
    })
  }

  public on(event: string, ...listeners: EventListener[]): this {
    return this.addListeners(event, ...listeners)
  }

  public off(event: string, ...listeners: EventListener[]): this {
    return this.removeListeners(event, ...listeners)
  }

  public once(event: string, ...listeners: EventListener[]): this {
    listeners.forEach(listener => {
      super.once(event, (data: any) => {
        listener(data)
        if (!this.listenerCount(event)) {
          this.unsubscribe(event)
            .catch(() => super.emit('error', new Error('Unable to unsubscribe from event')))
        }
      })
    })

    if (!this.subscriptions.has(event)) {
      this.subscribe(event)
        .catch(() => super.emit('error', new Error('Unable to subscribe to event')))
    }

    return this
  }

  public prependListener(event: string, listener: EventListener): this {
    return this.prependListeners(event, listener)
  }

  public prependListeners(event: string, ...listeners: EventListener[]): this {
    listeners.forEach(listener => super.prependListener(event, listener))

    if(!this.subscriptions.has(event)) {
      this.subscribe(event)
        .catch(() => super.emit('error', new Error('Unable to subscribe to event')))
    }

    return this
  }

  public prependOnceListener(event: string, listener: EventListener): this {
    return this.prependListeners(event, listener)
  }

  public prependOnceListeners(event: string, ...listeners: EventListener[]): this {
    listeners.forEach(listener => {
      super.prependOnceListener(event, (data: any) => {
        listener(data)
        if (!this.listenerCount(event)) {
          this.unsubscribe(event)
            .catch(() => super.emit('error', new Error('Unable to unsubscribe from event')))
        }
      })
    })

    if (!this.subscriptions.has(event)) {
      this.subscribe(event)
        .catch(() => super.emit('error', new Error('Unable to subscribe to event')))
    }

    return this
  }

  public addListener(event: string, listener: EventListener): this {
    return this.addListeners(event, listener)
  }

  public addListeners(event: string, ...listeners: EventListener[]): this {
    listeners.forEach(listener => super.addListener(event, listener))

    if (!this.subscriptions.has(event)) {
      this.subscribe(event)
        .catch(() => super.emit('error', new Error('Unable to subscribe to event')))
    }

    return this
  }

  public removeListener(event: string, listener: EventListener): this {
    return this.removeListeners(event, listener)
  }

  public removeListeners(event: string, ...listeners: EventListener[]): this {
    listeners.forEach(listener => super.removeListener(event, listener))

    if (!this.listenerCount(event)) {
      this.unsubscribe(event)
        .catch(() => super.emit('error', new Error('Unable to unsubscribe from event')))
    }

    return this
  }

  public removeAllListeners(...events: string[]): this {
    if (!events.length) {
      super.removeAllListeners()
      for (const subscription of this.subscriptions) {
        this.unsubscribe(subscription)
          .catch(() => super.emit('error', new Error('Unable to unsubscribe from event')))
      }
    } else {
      for (const event of events) {
        this.unsubscribe(event)
          .catch(() => super.emit('error', new Error('Unable to unsubscribe from event')))

        super.removeAllListeners(event)
      }
    }

    return this
  }

  public emit(event: string, data: any): boolean {
    this.emitAsync(event, data)
      .catch(() => super.emit('error', new Error('Unable to publish event')))
    return true
  }

  public emitAsync(event: string, data: any): Promise<number> {
    return this.connection.publishBuffer(`${this.prefix}events:${event}`, this.packr.pack(data ?? 1))
  }

  public async disconnect(): Promise<void> {
    if (this.subscriptions.size) {
      await Promise.all([...this.subscriptions].map(subscription => {
        return this.unsubscribe(subscription)
      }))
    }

    this.subscriber.disconnect()
  }

  private async subscribe(event: string): Promise<void> {
    if (this.subscriptions.has(event)) return
    await this.subscriber.subscribe(`${this.prefix}events:${event}`)
    this.subscriptions.add(event)
  }

  private async unsubscribe(event: string): Promise<void> {
    if (!this.subscriptions.has(event)) return
    await this.subscriber.unsubscribe(`${this.prefix}events:${event}`)
    this.subscriptions.delete(event)
  }
}
