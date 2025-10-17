# Desktop Data Architecture

The desktop app is designed to be able to run against a local backend or a remote backend. Currently, only the local backend is implemented, but there's an architecture in place to allow us to switch between remote and local in the future. The local backend uses SQLite for data storage.

To make this possible we impose the following dataflow constraints in the desktop.

```bash
# Data flow constraints
Native features (Rust)  -->  Typescript event handler  --> Typescript repos  -->  SQLite (Rust) or remote backend
```

1. Native features, such as transcription processing, are limited to only performing their action and then emitting an event (i.e. `transcription_complete`) that will be picked up by the typescript layer.
1. The typescript layer receives that event and then decides what to do with it. In the case of our transcription example, we want to store that data locally. So the typescript layer will call out to its `repo` layer. The repos will decide if they data should be stored locally or remotely based on whether remote configuration is enabled. If stored locally, the repo will call out to the appropriate Tauri command, reaching back out to the rust layer.
1. The rest side will pick up this command and go and insert this into SQLite database. 

This data flow and separation of concerns between the Rust features, the TypeScript layer, and the SQLite layer allow us to reuse code where possible and not store and maintain configurations in both the Rust layer and the TypeScript layer. 
