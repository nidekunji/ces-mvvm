let CES = require('ces');
let systemsClasses = {};
let comClasses = {};
let tttt = 0;
let _M = class {
    constructor() {
        this.world = new CES.World();
        this.systems = [];
        this.id = tttt++;
    }

    entOnce(coms) {
        let ent = this.ent(coms);
        this.world.removeEntity(ent);
    }

    ent(coms) {
        let entity = new CES.Entity();
        this.world.addEntity(entity);
        for (let key in coms) {
            this.com(key, coms[key], entity);
        }
        return entity
    }

    getFirstEnt() {
        let coms = arguments;
        if (typeof arguments[0] !== 'string') {
            coms = arguments[0]
        }
        let es = this.world.getEntities.apply(this.world, coms);

        return es[0];
    }

    comOnce(name, info, entity) {
        let [com, e] = this.com(name, info, entity);
        this.removeCom(e, name);
        if (e !== entity) {
            this.world.removeEntity(e);
        }
        return [com, e];
    }

    comSetOrGetOnce(name, info, entity) {
        let [com, e] = this.comSetOrGet(name, info, entity);
        this.removeCom(entity, name);
        if (e !== entity) {
            this.world.removeEntity(e);
        }
        return [com, e];
    }

    comSetOrGet(name, info, entity) {
        if (entity && entity.hasComponent(name)) {
            let component = entity.getComponent(name);
            return [component, entity]
        }

        return this.com(name, info, entity);
    }

    removeCom(entity, name) {
        entity.removeComponent(name);
        entity[name] = null;
    }

    com(name, info, entity) {
        let _C;
        if (comClasses[name]) {
            _C = comClasses[name]
        } else {
            _C = CES.Component.extend({
                name: name
            });
            comClasses[name] = _C
        }
        let component = new _C();

        if (info) {
            for (let key in info) {
                if (key === 'name') {
                    throw new Error("Don't use key 'name' in component." + name);
                }
                component[key] = info[key];
            }
        }
        if (!entity) {
            entity = new CES.Entity();
            this.world.addEntity(entity);
        }
        entity[name] = component;
        entity.addComponent(component);
        return [component, entity];
    }

    system(name, order) {
        let _S;
        if (systemsClasses[name]) {
            _S = systemsClasses[name];
        } else {
            _S = CES.System.extend({
                init: function () {
                    this.name = name;
                    this.holder = [];
                    this.removeHolder = [];
                    this.updateHolder = [];
                },
                addedToWorld: function (world) {
                    this.world = world;
                    for (let i = 0; i < this.holder.length; i++) {
                        let act = this.holder[i];
                        world.entityAdded(act.components).add(act.callback);
                    }
                    for (let i = 0; i < this.removeHolder.length; i++) {
                        let act = this.removeHolder[i];
                        world.entityRemoved(act.components).add(act.callback);
                    }
                },
                update: function (dt) {
                    for (let i = 0; i < this.updateHolder.length; i++) {
                        let act = this.updateHolder[i];
                        let arg = [];
                        if (typeof(act.components) === 'string') {
                            arg = [act.components]
                        } else {
                            arg = act.components;
                        }

                        let targets = this.world.getEntities.apply(this.world, arg);
                        act.callback(dt, targets);
                    }
                },
                on: function (components, callback) {
                    this.holder.push({components: components, callback: callback});
                },
                onRemove: function (components, callback) {
                    this.removeHolder.push({components: components, callback: callback});
                },
                onUpdate: function (components, callback) {
                    this.updateHolder.push({components: components, callback: callback});
                }
            });
            systemsClasses[name] = _S;
        }
        let system = new _S();
        this.systems.push({order: order, system: system});
        return system;
    }

    startSystems() {
        this.systems.sort(function (infoA, infoB) {
            return infoA.order - infoB.order
        });

        for (let i = 0; i < this.systems.length; i++) {
            if (window.stopedSystems) {
                if (window.stopedSystems.indexOf(this.systems[i].system.name) !== -1) {
                    continue;
                }
            }

            this.world.addSystem(this.systems[i].system);
        }
        return this.world;
    }
    destroy(e){
        this.world.removeEntity(e);
    }
};

module.exports = function () {
    return new _M();
};