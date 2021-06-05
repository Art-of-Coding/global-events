# Global Events

Global Events uses Redis and its publish/subscribe mechanism to provide
cross-system events. It is built on to of (or, rather, into) node's default
`EventEmitter`.

## Features

- Cross-system events
- Attach arbitrary data to events
  - Data is serialized by [msgpackr](https://github.com/kriszyp/msgpackr) for
    lightning-fast and light-weight payloads
- Ability to emit an event only locally, or only remotely

## Install

```
npm i @art-of-coding/global-events
```

## Example

```typescript
import IORedis from "ioredis";
import GlobalEvents from "@art-of-coding/global-events";

const connection = new IORedis();

const events = new GlobalEvents({
  connection,
  prefix: "prefix:",
  msgpackr: { structuredClone: true },
});

// Emit an event
events.emit("some-event");

// Emit an event with some data
events.emit("another-event", { some: "data" });

// Emit an event only locally
events.emit("my-event", undefined, { excludePublish: true });

// Emit an event only remotely (i.e. not emitted locally)
events.emit("remote-event", undefined, { excludeLocal: true });
```

## License

Copyright 2021 [Michiel van der Velde](https://michielvdvelde.nl).

This software is licensed under [the MIT License](LICENSE).
