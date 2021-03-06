var td = require("typedoc");
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};

(function (td) {
    var output;
    (function (output) {
        DashTypeKind = {};
        DashTypeKind[0]       = "Global";
        DashTypeKind[1]       = "Module";
        DashTypeKind[2]       = "Module";
        DashTypeKind[3]       = "Module";
        DashTypeKind[4]       = "Enum";
        DashTypeKind[16]      = "Entry";
        DashTypeKind[32]      = "Variable";
        DashTypeKind[64]      = "Function";
        DashTypeKind[128]     = "Class";
        DashTypeKind[256]     = "Interface";
        DashTypeKind[384]     = "Class";
        DashTypeKind[512]     = "Constructor";
        DashTypeKind[1024]    = "Property";
        DashTypeKind[1056]    = "Property";
        DashTypeKind[2048]    = "Method";
        DashTypeKind[2112]    = "Method";
        DashTypeKind[4096]    = null; //"CallSignature";
        DashTypeKind[8192]    = null; //"IndexSignature";
        DashTypeKind[16384]   = "Constructor";
        DashTypeKind[32768]   = "Parameter";
        DashTypeKind[65536]   = null; //"TypeLiteral";
        DashTypeKind[131072]  = null; //"TypeParameter";
        DashTypeKind[262144]  = null; // "Accessor";
        DashTypeKind[524288]  = null; // "GetSignature";
        DashTypeKind[1048576] = null; // "SetSignature";
        DashTypeKind[1601536] = null; // "SomeSignature";
        DashTypeKind[2097152] = null; // "ObjectLiteral";
        DashTypeKind[4194304] = "Type"; //"TypeAlias";
        DashTypeKind[8388608] = "Event";

        /**
         * Generates Info.plist
         */
        var InfoPlistPlugin = (function (_super) {
            __extends(InfoPlistPlugin, _super);

            function InfoPlistPlugin(renderer) {
                _super.call(this, renderer);
                renderer.on(output.Renderer.EVENT_BEGIN, this.onRendererBegin, this);
            }

            InfoPlistPlugin.prototype.onRendererBegin = function(event) {
                var name = event.settings.name;

                var from = td.Path.join(this.renderer.theme.basePath, 'assets');
                var dir  = td.Path.join(event.outputDirectory, 'Contents');
                td.ensureDirectoriesExist(dir);

                var file = td.Path.join(dir, "Info.plist");
                var templateFile = td.FS.readFileSync(td.Path.join(this.renderer.theme.basePath, 'templates', 'Info.plist.hsb'), 'utf-8');
                td.writeFile(file, td.Handlebars.compile(templateFile)({ name: name, bundle: name.toLowerCase() }), false);
            };

            return InfoPlistPlugin;
        })(output.RendererPlugin);

        /**
         * Copies Dash assets.
         */
        var DashAssetsPlugin = (function (_super) {
            __extends(DashAssetsPlugin, _super);

            function DashAssetsPlugin(renderer) {
                _super.call(this, renderer);
                renderer.on(output.Renderer.EVENT_BEGIN, this.onRendererBegin, this);
                renderer.on(output.Renderer.EVENT_END, this.onRendererEnd, this);
            }

            DashAssetsPlugin.prototype.onRendererBegin = function(event) {
                var from = td.Path.join(this.renderer.theme.basePath, 'assets');
                var to   = td.Path.join(event.outputDirectory, 'Contents', 'Resources', 'Documents', 'assets');
                td.ensureDirectoriesExist(to);

                if (td.FS.existsSync(from)) td.FS.copySync(from, to);

                this._copyIcons(event.outputDirectory);
            };

            DashAssetsPlugin.prototype._copyIcons = function(dstIconsPath) {
                var srcIconsPath = process.env.TYPEDOC_DASH_ICONS_PATH;
                if (!srcIconsPath) {
                  console.log("\nNOTE: Docset icons are not specified!");
                  console.log("      You can specify the directory where icon.png and icon@2x.png reside with");
                  console.log("      TYPEDOC_DASH_ICONS_PATH environment variable. They will be copied into the docset.\n");

                  return;
                }

                this._copyIcon(srcIconsPath, dstIconsPath, 'icon.png');
                this._copyIcon(srcIconsPath, dstIconsPath, 'icon@2x.png');
            };

            DashAssetsPlugin.prototype._copyIcon = function(srcIconsPath, dstIconsPath, name) {
                var srcIconPath = td.Path.join(srcIconsPath, name);
                var dstIconPath = td.Path.join(dstIconsPath, name);
                if (td.FS.existsSync(srcIconPath)) {
                    td.FS.copySync(srcIconPath, dstIconPath);
                }
            };

            DashAssetsPlugin.prototype.onRendererEnd = function(event) {
                var assetsDirectory = td.Path.join(event.outputDirectory, 'assets');
                td.FS.removeSync(assetsDirectory);
            };

            return DashAssetsPlugin;
        })(output.RendererPlugin);

        /**
         * A plugin that builds Dash index.
         */
        var DashIndexPlugin = (function (_super) {
            __extends(DashIndexPlugin, _super);

            function DashIndexPlugin(renderer) {
                _super.call(this, renderer);
                renderer.on(output.Renderer.EVENT_BEGIN, this.onRendererBegin, this);
                renderer.on(output.Renderer.EVENT_BEGIN_PAGE, this.onRendererBeginPage, this);
                renderer.on(output.Renderer.EVENT_END, this.onRendererEnd, this);
            }

            DashIndexPlugin.prototype.onRendererBegin = function(event) {
              this.documentsPath = td.Path.join(event.outputDirectory, 'Contents', 'Resources', 'Documents');
              td.ensureDirectoriesExist(this.documentsPath);

              var path = td.Path.join(event.outputDirectory, 'Contents', 'Resources', 'docSet.dsidx');
              var sqlite3 = require('sqlite3').verbose();

              this.db = new sqlite3.Database(path);

              this.db.serialize();
              this.db.run("CREATE TABLE searchIndex(id INTEGER PRIMARY KEY, name TEXT, type TEXT, path TEXT)");
              this.db.run("CREATE UNIQUE INDEX anchor ON searchIndex (name, type, path)");
            }

            DashIndexPlugin.prototype.onRendererEnd = function(event) {
              this.db.close();
            }

            DashIndexPlugin.prototype.onRendererBeginPage = function(page) {
                // redirect page to the documents folder
                page.filename = td.Path.join(this.documentsPath, page.url);

                var model = page.model;
                if (!(model instanceof td.models.Reflection) || !page.model.dashTypeKind) {
                    return;
                }

              this.db.run("INSERT OR IGNORE INTO searchIndex(name, type, path) VALUES (?, ?, ?)", [ page.model.name, page.model.dashTypeKind, page.url ], function(e) { if (e != null) console.log(e); });
            }

            return DashIndexPlugin;
        })(output.RendererPlugin);

        /**
         * Default theme implementation of TypeDoc. If a theme does not provide a custom
         * [[BaseTheme]] implementation, this theme class will be used.
         */
        var DashDocsetTheme = (function (_super) {
            __extends(DashDocsetTheme, _super);
            /**
             * Create a new DashDocsetTheme instance.
             *
             * @param renderer  The renderer this theme is attached to.
             * @param basePath  The base path of this theme.
             */
            function DashDocsetTheme(renderer, basePath) {
                _super.call(this, renderer, basePath);
                renderer.on(output.Renderer.EVENT_BEGIN, this.onRendererBegin, this, 1024);
                this.dashIndexPlugin = new DashIndexPlugin(renderer);
                this.dashAssetsPlugin = new DashAssetsPlugin(renderer);
                this.infoPlistPlugin = new InfoPlistPlugin(renderer);
            }
            /**
             * Test whether the given path contains a documentation generated by this theme.
             *
             * @param path  The path of the directory that should be tested.
             * @returns     TRUE if the given path seems to be a previous output directory,
             *              otherwise FALSE.
             */
            DashDocsetTheme.prototype.isOutputDirectory = function (path) {
                if (!td.FS.existsSync(td.Path.join(path, 'index.html')))
                    return false;
                if (!td.FS.existsSync(td.Path.join(path, 'assets')))
                    return false;
                if (!td.FS.existsSync(td.Path.join(path, 'assets', 'js', 'main.js')))
                    return false;
                if (!td.FS.existsSync(td.Path.join(path, 'assets', 'images', 'icons.png')))
                    return false;
                return true;
            };
            DashDocsetTheme.prototype.getParameters = function () {
                return [{
                        name: 'gaID',
                        help: 'Set the Google Analytics tracking ID and activate tracking code.'
                    }, {
                        name: 'gaSite',
                        help: 'Set the site name for Google Analytics. Defaults to `auto`.',
                        defaultValue: 'auto'
                    }, {
                        name: 'hideGenerator',
                        help: 'Do not print the TypeDoc link at the end of the page.',
                        type: td.ParameterType.Boolean
                    }, {
                        name: 'entryPoint',
                        help: 'Specifies the fully qualified name of the root symbol. Defaults to global namespace.',
                        type: td.ParameterType.String
                    }];
            };
            /**
             * Map the models of the given project to the desired output files.
             *
             * @param project  The project whose urls should be generated.
             * @returns        A list of [[UrlMapping]] instances defining which models
             *                 should be rendered to which files.
             */
            DashDocsetTheme.prototype.getUrls = function (project) {
                var urls = [];
                var entryPoint = this.getEntryPoint(project);
                if (this.renderer.application.options.readme == 'none') {
                    entryPoint.url = 'index.html';
                    urls.push(new output.UrlMapping('index.html', entryPoint, 'reflection.hbs'));
                }
                else {
                    entryPoint.url = 'globals.html';
                    urls.push(new output.UrlMapping('globals.html', entryPoint, 'reflection.hbs'));
                    urls.push(new output.UrlMapping('index.html', project, 'index.hbs'));
                }
                if (entryPoint.children) {
                    entryPoint.children.forEach(function (child) {
                        DashDocsetTheme.buildUrls(child, urls);
                    });
                }
                return urls;
            };
            /**
             * Return the entry point of the documentation.
             *
             * @param project  The current project.
             * @returns The reflection that should be used as the entry point.
             */
            DashDocsetTheme.prototype.getEntryPoint = function (project) {
                var entryPoint = this.renderer.application.options.entryPoint;
                if (entryPoint) {
                    var reflection = project.getChildByName(entryPoint);
                    if (reflection) {
                        if (reflection instanceof td.models.ContainerReflection) {
                            return reflection;
                        }
                        else {
                            this.renderer.application.logger.warn('The given entry point `%s` is not a container.', entryPoint);
                        }
                    }
                    else {
                        this.renderer.application.logger.warn('The entry point `%s` could not be found.', entryPoint);
                    }
                }
                return project;
            };
            /**
             * Create a navigation structure for the given project.
             *
             * @param project  The project whose navigation should be generated.
             * @returns        The root navigation item.
             */
            DashDocsetTheme.prototype.getNavigation = function (project) {
                /**
                 * Test whether the given list of modules contains an external module.
                 *
                 * @param modules  The list of modules to test.
                 * @returns        TRUE if any of the modules is marked as being external.
                 */
                function containsExternals(modules) {
                    for (var index = 0, length = modules.length; index < length; index++) {
                        if (modules[index].flags.isExternal)
                            return true;
                    }
                    return false;
                }
                /**
                 * Sort the given list of modules by name, groups external modules at the bottom.
                 *
                 * @param modules  The list of modules that should be sorted.
                 */
                function sortReflections(modules) {
                    modules.sort(function (a, b) {
                        if (a.flags.isExternal && !b.flags.isExternal)
                            return 1;
                        if (!a.flags.isExternal && b.flags.isExternal)
                            return -1;
                        return a.getFullName() < b.getFullName() ? -1 : 1;
                    });
                }
                /**
                 * Find the urls of all children of the given reflection and store them as dedicated urls
                 * of the given NavigationItem.
                 *
                 * @param reflection  The reflection whose children urls should be included.
                 * @param item        The navigation node whose dedicated urls should be set.
                 */
                function includeDedicatedUrls(reflection, item) {
                    (function walk(reflection) {
                        for (var key in reflection.children) {
                            var child = reflection.children[key];
                            if (child.hasOwnDocument && !child.kindOf(td.models.ReflectionKind.SomeModule)) {
                                if (!item.dedicatedUrls)
                                    item.dedicatedUrls = [];
                                item.dedicatedUrls.push(child.url);
                                walk(child);
                            }
                        }
                    })(reflection);
                }
                /**
                 * Create navigation nodes for all container children of the given reflection.
                 *
                 * @param reflection  The reflection whose children modules should be transformed into navigation nodes.
                 * @param parent      The parent NavigationItem of the newly created nodes.
                 */
                function buildChildren(reflection, parent) {
                    var modules = reflection.getChildrenByKind(td.models.ReflectionKind.SomeModule);
                    modules.sort(function (a, b) {
                        return a.getFullName() < b.getFullName() ? -1 : 1;
                    });
                    modules.forEach(function (reflection) {
                        var item = output.NavigationItem.create(reflection, parent);
                        includeDedicatedUrls(reflection, item);
                        buildChildren(reflection, item);
                    });
                }
                /**
                 * Create navigation nodes for the given list of reflections. The resulting nodes will be grouped into
                 * an "internal" and an "external" section when applicable.
                 *
                 * @param reflections  The list of reflections which should be transformed into navigation nodes.
                 * @param parent       The parent NavigationItem of the newly created nodes.
                 * @param callback     Optional callback invoked for each generated node.
                 */
                function buildGroups(reflections, parent, callback) {
                    var state = -1;
                    var hasExternals = containsExternals(reflections);
                    sortReflections(reflections);
                    reflections.forEach(function (reflection) {
                        if (hasExternals && !reflection.flags.isExternal && state != 1) {
                            new output.NavigationItem('Internals', null, parent, "tsd-is-external");
                            state = 1;
                        }
                        else if (hasExternals && reflection.flags.isExternal && state != 2) {
                            new output.NavigationItem('Externals', null, parent, "tsd-is-external");
                            state = 2;
                        }
                        var item = output.NavigationItem.create(reflection, parent);
                        includeDedicatedUrls(reflection, item);
                        if (callback)
                            callback(reflection, item);
                    });
                }
                /**
                 * Build the navigation structure.
                 *
                 * @param hasSeparateGlobals  Has the project a separated globals.html file?
                 * @return                    The root node of the generated navigation structure.
                 */
                function build(hasSeparateGlobals) {
                    var root = new output.NavigationItem('Index', 'index.html');
                    if (entryPoint == project) {
                        var globals = new output.NavigationItem('Globals', hasSeparateGlobals ? 'globals.html' : 'index.html', root);
                        globals.isGlobals = true;
                    }
                    var modules = [];
                    project.getReflectionsByKind(td.models.ReflectionKind.SomeModule).forEach(function (someModule) {
                        var target = someModule.parent;
                        var inScope = (someModule == entryPoint);
                        while (target) {
                            if (target.kindOf(td.models.ReflectionKind.ExternalModule))
                                return;
                            if (entryPoint == target)
                                inScope = true;
                            target = target.parent;
                        }
                        if (inScope) {
                            modules.push(someModule);
                        }
                    });
                    if (modules.length < 10) {
                        buildGroups(modules, root);
                    }
                    else {
                        buildGroups(entryPoint.getChildrenByKind(td.models.ReflectionKind.SomeModule), root, buildChildren);
                    }
                    return root;
                }
                var entryPoint = this.getEntryPoint(project);
                return build(this.renderer.application.options.readme != 'none');
            };

            DashDocsetTheme.prototype.createDatabase = function() {
              var db = null;

              return db;
            };

            /**
             * Triggered before the renderer starts rendering a project.
             *
             * @param event  An event object describing the current render operation.
             */
            DashDocsetTheme.prototype.onRendererBegin = function (event) {
                if (event.project.groups) {
                    event.project.groups.forEach(DashDocsetTheme.applyGroupClasses);
                }

                for (var id in event.project.reflections) {
                    var reflection = event.project.reflections[id];
                    if (reflection instanceof td.models.DeclarationReflection) {
                        DashDocsetTheme.applyReflectionClasses(reflection);
                        DashDocsetTheme.applyReflectionDashKind(reflection);
                    }
                    if (reflection instanceof td.models.ContainerReflection && reflection['groups']) {
                        reflection['groups'].forEach(DashDocsetTheme.applyGroupClasses);
                    }
                }
            };
            /**
             * Return a url for the given reflection.
             *
             * @param reflection  The reflection the url should be generated for.
             * @param relative    The parent reflection the url generation should stop on.
             * @param separator   The separator used to generate the url.
             * @returns           The generated url.
             */
            DashDocsetTheme.getUrl = function (reflection, relative, separator) {
                if (separator === void 0) { separator = '.'; }
                var url = reflection.getAlias();
                if (reflection.parent && reflection.parent != relative &&
                    !(reflection.parent instanceof td.models.ProjectReflection))
                    url = DashDocsetTheme.getUrl(reflection.parent, relative, separator) + separator + url;
                return url;
            };
            /**
             * Return the template mapping fore the given reflection.
             *
             * @param reflection  The reflection whose mapping should be resolved.
             * @returns           The found mapping or NULL if no mapping could be found.
             */
            DashDocsetTheme.getMapping = function (reflection) {
                for (var i = 0, c = DashDocsetTheme.MAPPINGS.length; i < c; i++) {
                    var mapping = DashDocsetTheme.MAPPINGS[i];
                    if (reflection.kindOf(mapping.kind)) {
                        return mapping;
                    }
                }
                return null;
            };
            /**
             * Build the url for the the given reflection and all of its children.
             *
             * @param reflection  The reflection the url should be created for.
             * @param urls        The array the url should be appended to.
             * @returns           The altered urls array.
             */
            DashDocsetTheme.buildUrls = function (reflection, urls) {
                var mapping = DashDocsetTheme.getMapping(reflection);
                if (mapping) {
                    var url = [mapping.directory, DashDocsetTheme.getUrl(reflection) + '.html'].join('/');
                    urls.push(new output.UrlMapping(url, reflection, mapping.template));
                    reflection.url = url;
                    reflection.hasOwnDocument = true;
                    for (var key in reflection.children) {
                        var child = reflection.children[key];
                        if (mapping.isLeaf) {
                            DashDocsetTheme.applyAnchorUrl(child, reflection);
                        }
                        else {
                            DashDocsetTheme.buildUrls(child, urls);
                        }
                    }
                }
                else {
                    DashDocsetTheme.applyAnchorUrl(reflection, reflection.parent);
                }
                return urls;
            };
            /**
             * Generate an anchor url for the given reflection and all of its children.
             *
             * @param reflection  The reflection an anchor url should be created for.
             * @param container   The nearest reflection having an own document.
             */
            DashDocsetTheme.applyAnchorUrl = function (reflection, container) {
                var anchor = DashDocsetTheme.getUrl(reflection, container, '.');
                if (reflection['isStatic']) {
                    anchor = 'static-' + anchor;
                }
                reflection.url = container.url + '#' + anchor;
                reflection.anchor = anchor;
                reflection.hasOwnDocument = false;
                reflection.traverse(function (child) {
                    if (child instanceof td.models.DeclarationReflection) {
                        DashDocsetTheme.applyAnchorUrl(child, container);
                    }
                });
            };

            DashDocsetTheme.applyReflectionDashKind = function (reflection) {
              var dashTypeKind = DashTypeKind[reflection.kind];
              if (dashTypeKind) reflection.dashTypeKind = dashTypeKind;
            };

            /**
             * Generate the css classes for the given reflection and apply them to the
             * [[DeclarationReflection.cssClasses]] property.
             *
             * @param reflection  The reflection whose cssClasses property should be generated.
             */
            DashDocsetTheme.applyReflectionClasses = function (reflection) {
                var classes = [];
                if (reflection.kind == td.models.ReflectionKind.Accessor) {
                    if (!reflection.getSignature) {
                        classes.push('tsd-kind-set-signature');
                    }
                    else if (!reflection.setSignature) {
                        classes.push('tsd-kind-get-signature');
                    }
                    else {
                        classes.push('tsd-kind-accessor');
                    }
                }
                else {
                    var kind = td.models.ReflectionKind[reflection.kind];
                    classes.push(DashDocsetTheme.toStyleClass('tsd-kind-' + kind));
                }
                if (reflection.parent && reflection.parent instanceof td.models.DeclarationReflection) {
                    kind = td.models.ReflectionKind[reflection.parent.kind];
                    classes.push(DashDocsetTheme.toStyleClass('tsd-parent-kind-' + kind));
                }
                var hasTypeParameters = !!reflection.typeParameters;
                reflection.getAllSignatures().forEach(function (signature) {
                    hasTypeParameters = hasTypeParameters || !!signature.typeParameters;
                });
                if (hasTypeParameters)
                    classes.push('tsd-has-type-parameter');
                if (reflection.overwrites)
                    classes.push('tsd-is-overwrite');
                if (reflection.inheritedFrom)
                    classes.push('tsd-is-inherited');
                if (reflection.flags.isPrivate)
                    classes.push('tsd-is-private');
                if (reflection.flags.isProtected)
                    classes.push('tsd-is-protected');
                if (reflection.flags.isStatic)
                    classes.push('tsd-is-static');
                if (reflection.flags.isExternal)
                    classes.push('tsd-is-external');
                if (!reflection.flags.isExported)
                    classes.push('tsd-is-not-exported');
                reflection.cssClasses = classes.join(' ');
            };
            /**
             * Generate the css classes for the given reflection group and apply them to the
             * [[ReflectionGroup.cssClasses]] property.
             *
             * @param group  The reflection group whose cssClasses property should be generated.
             */
            DashDocsetTheme.applyGroupClasses = function (group) {
                var classes = [];
                if (group.allChildrenAreInherited)
                    classes.push('tsd-is-inherited');
                if (group.allChildrenArePrivate)
                    classes.push('tsd-is-private');
                if (group.allChildrenAreProtectedOrPrivate)
                    classes.push('tsd-is-private-protected');
                if (group.allChildrenAreExternal)
                    classes.push('tsd-is-external');
                if (!group.someChildrenAreExported)
                    classes.push('tsd-is-not-exported');
                group.cssClasses = classes.join(' ');
            };
            /**
             * Transform a space separated string into a string suitable to be used as a
             * css class, e.g. "constructor method" > "Constructor-method".
             */
            DashDocsetTheme.toStyleClass = function (str) {
                return str.replace(/(\w)([A-Z])/g, function (m, m1, m2) { return m1 + '-' + m2; }).toLowerCase();
            };
            /**
             * Mappings of reflections kinds to templates used by this theme.
             */
            DashDocsetTheme.MAPPINGS = [{
                    kind: [td.models.ReflectionKind.Class],
                    isLeaf: false,
                    directory: 'classes',
                    template: 'reflection.hbs'
                }, {
                    kind: [td.models.ReflectionKind.Interface],
                    isLeaf: false,
                    directory: 'interfaces',
                    template: 'reflection.hbs'
                }, {
                    kind: [td.models.ReflectionKind.Enum],
                    isLeaf: false,
                    directory: 'enums',
                    template: 'reflection.hbs'
                }, {
                    kind: [td.models.ReflectionKind.Module, td.models.ReflectionKind.ExternalModule],
                    isLeaf: false,
                    directory: 'modules',
                    template: 'reflection.hbs'
                }];
            return DashDocsetTheme;
        })(output.Theme);
        output.DashDocsetTheme = DashDocsetTheme;
    })(output = td.output || (td.output = {}));
})(td || (td = {}));

exports = td.output.DashDocsetTheme;
