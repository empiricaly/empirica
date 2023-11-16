#!/bin/bash

set -e
trap "exit" INT

# define your list of paths here
docs="src/admin/index.ts src/admin/classic/index.ts src/player/index.ts src/player/react/index.ts src/player/classic/index.ts src/player/classic/react/index.ts src/utils/console.ts"

# "../../../../docsv2/api"
outdir="${OUT:-docs}"

# loop over each path
for path in $docs; do
    echo $path
    # remove "src/" and "/index.ts" from the path
    cleaned_path=${path#src/}
    cleaned_path=${cleaned_path%/index.ts}
    underscored_path=$(echo $cleaned_path | tr '/' '_')
    npx typedoc --kindsWithOwnFile none --excludeInternal --excludePrivate --excludeProtected --plugin typedoc-plugin-markdown --out "${outdir}/${underscored_path}" $path
done