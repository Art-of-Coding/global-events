# Global Events

Global Events is a node.js library which provides cross-process events by
utilizing `Redis`' publish/subscribe mechanism. Events can be sent from any
process, and all subscribed listeners will receive the event and its optional
payload.

Global Events is built on top of (or rather, _into_) node's native
`EventEmitter`, making it easy and familiar to use.

## Features

- Send cross-process events the same way as you would locally
- Attach arbitrary data payloads to events
  - Data payloads are serialized by
    [msgpackr](https://github.com/kriszyp/msgpackr) for lightning-fast,
    light-weight payloads

## Install

```
npm i @art-of-coding/global-events
```

## Example

```typescript
import IORedis from "ioredis";
import GlobalEvents from "@art-of-coding/global-events";

// Create a non-dedicated connection
// You can use this connection elsewhere
const connection = new IORedis();

const events = new GlobalEvents({
  // Set the Redis connection
  // This connection is duplicated internally to act as subscriber
  connection,
  // An optional prefix
  prefix: "prefix:",
  // Optional msgpackr configuration
  // See https://github.com/kriszyp/msgpackr#options
  msgpackr: { useRecords: true },
});

// Listen for an event
// Will automatically subscribe to the event if no subscription is open yet
events.on("expected-event", (data: MyDataInterface) => {
  // `data` is the event data if the event had a data payload
});

// Emit an event
events.emit("some-event");

// Emit an async event
await events.emitAsync("async-event");

// Emit an event with some data
events.emit("another-event", { some: "data" });

// Disconnect the subscriber
// After calling this the instance is no longer usable
await events.disconnect();
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
