#!/bin/bash

cd "$(dirname "$0")"
PROJECT=${1:-"prod"}
firebase firestore:indexes --project $PROJECT > firestore.indexes.json
