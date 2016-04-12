# Dash theme for TypeDoc

This module contains the Dash theme of TypeDoc.
* Visit https://kapeli.com/dash to learn more about Dash.
* Visit https://typedoc.io to learn more about TypeDoc.


## Generating docs

Two easy steps:

* Add this module to your TypeScript project:

        $ npm install --dev typedoc-dash-theme typedoc

* Generate the doc:

        $ TYPEDOC_DASH_ICONS_PATH=path/to/icons/ grunt typedoc \
            --theme node_modules/typedoc-dash-theme/bin \
            --out <path/to/MyProject.docset>


## Configuration

Configuration is passed via environment variables:

* TYPEDOC_DASH_ICONS_PATH -- the path to a directory with `icon.png`
  (16x16) and `icon@2x.png` (32x32). Either one or both of these images
  will be copied to the docset and appear as normal and retina screen icons.


## Contributing

Contributions are welcome and appreciated.


## License

Copyright (c) 2016 [Aleksey Gureiev](http://noizeramp.com).<br>
Licensed under the Apache License 2.0.
