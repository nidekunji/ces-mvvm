var Class = require('class'),
    Family = require('family'),
    EntityList = require('entitylist');

/**
 * The world is the container of all the entities and systems.
 * @class
 */
var World = module.exports = Class.extend({
    /**
     * @constructor
     */
    init: function () {
        /**
         * A map from familyId to family
         * @private
         */
        this._families = {};


        this._familyIndex = {};

        /**
         * @private
         */
        this._systems = [];

        /**
         * @private
         */
        this._entities = new EntityList();

        if (window.debugToy) {
            this.update = function (dt) {
                var systems, i, len;

                systems = this._systems;
                let heavy = {};
                let start = Date.now();

                for (i = 0, len = systems.length; i < len; ++i) {
                    let first = Date.now();
                    systems[i].update(dt);
                    let after = Date.now();
                    let consume = after - first;
                    // output[systems[i].name] = consume;
                    if (consume > 0) {
                        heavy[systems[i].name] = consume;
                    }
                }
                let end = Date.now();
                if (end - start > window.debugToy) {
                    cc.log('systems consume', heavy, end - start);
                }
            }
        }
    },

    /**
     * Add a system to this world.
     * @public
     * @param {System} system
     */
    addSystem: function (system) {
        this._systems.push(system);
        system.addedToWorld(this);
        return this;
    },

    /**
     * Remove a system from this world.
     * @public
     * @param {System} system
     */
    removeSystem: function (system) {
        var systems, i, len;

        systems = this._systems;
        for (i = 0, len = systems.length; i < len; ++i) {
            if (systems[i] === system) {
                systems.splice(i, 1);
                system.removedFromWorld();
            }
        }
    },

    /**
     * Add an entity to this world.
     * @public
     * @param {Entity} entity
     */
    addEntity: function (entity) {
        var families, familyId, self;

        // try to add the entity into each family
        // families = this._families;
        // for (familyId in families) {
        //     families[familyId].addEntityIfMatch(entity);
        // }

        for (let key in entity._components) {
            let component = entity._components[key];
            if (component) {
                this._familyIndex[component.name] = this._familyIndex[component.name] || [];
                let families = this._familyIndex[component.name];
                for (let x = families.length; x--;) {
                    families[x].addEntityIfMatch(entity);
                }
            }
        }


        self = this;

        // update the entity-family relationship whenever components are
        // added to or removed from the entities
        entity.onComponentAdded.add(function (entity, component) {
            self._onComponentAdded(entity, component);
        });
        entity.onComponentRemoved.add(function (entity, component) {
            self._onComponentRemoved(entity, component);
        });

        this._entities.add(entity);
    },


    /**
     * Remove and entity from this world.
     * @public
     * @param {Entity} entity
     */
    removeEntity: function (entity) {
        var families, familyId;

        // try to remove the entity from each family
        // families = this._families;
        // for (familyId in families) {
        //     families[familyId].removeEntity(entity);
        // }
        //

        for (let key in entity._components) {
            let component = entity._components[key];
            if (component) {
                this._familyIndex[component.name] = this._familyIndex[component.name] || [];

                let families = this._familyIndex[component.name];
                for (let x = families.length; x--;) {
                    families[x].removeEntity(entity);
                }
            }
        }

        this._entities.remove(entity);
        entity.removed = true;
    }
    ,

    /**
     * Get the entities having all the specified componets.
     * @public
     * @param {...String} componentNames
     * @return {Array} an array of entities.
     */
    getEntities: function (/* componentNames */) {
        var familyId, families;

        familyId = this._getFamilyId(arguments);
        this._ensureFamilyExists(arguments);

        return this._families[familyId].getEntities();
    }
    ,

    /**
     * For each system in the world, call its `update` method.
     * @public
     * @param {Number} dt time interval between updates.
     */
    update: function (dt) {
        var systems, i, len;

        systems = this._systems;
        // let output = {};
        for (i = 0, len = systems.length; i < len; ++i) {
            // let first = Date.now();
            systems[i].update(dt);
            // let after = Date.now();
            // output[systems[i].name] = after - first;
        }
        // cc.log(output);
    }
    ,

    /**
     * Returns the signal for entities added with the specified components. The
     * signal is also emitted when a component is added to an entity causing it
     * match the specified component names.
     * @public
     * @param {...String} componentNames
     * @return {Signal} A signal which is emitted every time an entity with
     *     specified components is added.
     */
    entityAdded: function (/* componentNames */) {
        var familyId, families;
        let components = arguments;
        if (typeof arguments[0] !== 'string') {
            components = arguments[0];
        }

        familyId = this._getFamilyId(components);
        this._ensureFamilyExists(components);

        return this._families[familyId].entityAdded;
    }
    ,

    /**
     * Returns the signal for entities removed with the specified components.
     * The signal is also emitted when a component is removed from an entity
     * causing it to no longer match the specified component names.
     * @public
     * @param {...String} componentNames
     * @return {Signal} A signal which is emitted every time an entity with
     *     specified components is removed.
     */
    entityRemoved: function (/* componentNames */) {
        var familyId, families;

        familyId = this._getFamilyId(arguments);
        this._ensureFamilyExists(arguments);

        return this._families[familyId].entityRemoved;
    }
    ,

    /**
     * Creates a family for the passed array of component names if it does not
     * exist already.
     * @param {Array.<String>} components
     */
    _ensureFamilyExists: function (components) {
        var families = this._families;
        var familyId = this._getFamilyId(components);

        if (!families[familyId]) {
            families[familyId] = new Family(
                Array.prototype.slice.call(components)
            );
            for (let i = 0; i < components.length; i++) {
                let key = components[i];
                this._familyIndex[key] = this._familyIndex[key] || [];
                this._familyIndex[key].push(families[familyId]);
            }

            for (var node = this._entities.head; node; node = node.next) {
                families[familyId].addEntityIfMatch(node.entity);
            }
        }
    }
    ,

    /**
     * Returns the family ID for the passed array of component names. A family
     * ID is a comma separated string of all component names with a '$'
     * prepended.
     * @param {Array.<String>} components
     * @return {String} The family ID for the passed array of components.
     */
    _getFamilyId: function (components) {
        return '$' + Array.prototype.join.call(components, ',');
    }
    ,

    /**
     * Handler to be called when a component is added to an entity.
     * @private
     * @param {Entity} entity
     * @param {String} componentName
     */
    _onComponentAdded: function (entity, componentName) {
        // var families, familyId;
        //
        // families = this._families;
        // for (familyId in families) {
        //     families[familyId].onComponentAdded(entity, componentName);
        // }_familyIndex

        this._familyIndex[componentName] = this._familyIndex[componentName] || [];
        let families = this._familyIndex[componentName];
        for (let x = 0; x < families.length; x++) {
            families[x].onComponentAdded(entity, componentName);
        }
    }
    ,

    /**
     * Handler to be called when component is removed from an entity.
     * @private
     * @param {Entity} entity
     * @param {String} componentName
     */
    _onComponentRemoved: function (entity, componentName) {
        // var families, familyId;
        //
        // families = this._families;
        // for (familyId in families) {
        //     families[familyId].onComponentRemoved(entity, componentName);
        // }

        this._familyIndex[componentName] = this._familyIndex[componentName] || [];
        let families = this._familyIndex[componentName];
        for (let x = 0; x < families.length; x++) {
            families[x].onComponentRemoved(entity, componentName);
        }
    }
});
