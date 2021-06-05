import { EventEmitter } from 'events'
import { Packr, Unpackr } from 'msgpackr'
import { Options as PackrOptions } from 'msgpackr/unpack'
import { Redis } from 'ioredis'

export interface Options {
  connection: Redis,
  prefix?: string,
  msgpackr?: PackrOptions,
  autoSubscribe?: boolean,
}

export default class GlobalEvents extends EventEmitter {
  public readonly  prefix: string = ''

  private readonly connection: Redis
  private readonly subscriber: Redis
  private readonly packr: Packr
  private readonly unpackr: Unpackr
  private subscribed = false

  public constructor(opts: Options) {
    super()
    this.connection = opts.connection
    this.subscriber = opts.connection.duplicate()
    this.packr = new Packr(opts.msgpackr)
    this.unpackr = new Unpackr(opts.msgpackr)

    if (opts.prefix) this.prefix = opts.prefix

    if (typeof opts.autoSubscribe === 'undefined' || opts.autoSubscribe === true) {
      this.subscribe().catch(() => {
        super.emit('error', new Error('Unable to subscribe'))
      })
    }
  }

  public emit(event: string, data?: any, opts: { excludePublish?: boolean, excludeLocal?: boolean } = {}): boolean {
    if (!opts.excludePublish) {
      this.connection.publishBuffer(`${this.prefix}events:${event}`, this.packr.pack(data ?? 1))
        .catch(() => super.emit('error', new Error('Unable to publish event')))
    }

    if (!opts.excludeLocal) {
      super.emit(event, data)
    }

    return true
  }

  public async subscribe(): Promise<void> {
    if (this.subscribed) return

    if (!this.subscriber.listenerCount('messageBuffer')) {
      this.subscriber.on('messageBuffer', (channelBuf: Buffer, messageBuf: Buffer) => {
        const channel = channelBuf.toString('utf-8')
        const event = channel.substring(this.prefix.length + 7)
        super.emit(event, this.unpackr.unpack(messageBuf))
      })
    }

    await this.subscriber.psubscribe(`${this.prefix}events:*`)
    this.subscribed = true
  }

  public async unsubscribe(): Promise<void> {
    if (!this.subscribed) return

    await this.subscriber.punsubscribe(`${this.prefix}events:*`)
    this.subscribed = false
  }
}
