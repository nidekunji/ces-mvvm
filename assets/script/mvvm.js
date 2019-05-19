let Label = cc.Label;
let RichText = cc.RichText;
let Button = cc.Button;
let Toggle = cc.Toggle;
let ToggleContainer = cc.ToggleContainer;
let EditBox = cc.EditBox;
let Sprite = cc.Sprite;
let Animation = cc.Animation;
let AudioSource = cc.AudioSource;
let bind = require('binding').bind;

let deepCopy = function (obj, target = null) {
    let output = target || (obj instanceof Array ? [] : {});
    for (let key in obj) {
        if (!(obj[key] instanceof cc.Node) && (obj[key] instanceof Object &&
                typeof obj[key] != 'function') ||
            obj[key] instanceof Array) {
            output[key] = deepCopy(obj[key], output[key])
        } else {
            output[key] = obj[key];
        }
    }

    return output;
};

function mvvm(view, data, methods, path, parent) {

    for (let key in view) {
        if (key.endsWith('/')) {
            throw new Error('路径不能由/结尾');
        }
        action(key, view[key], data, methods, path, parent);
    }
}

let ArrayDuress = function (array, value, prefab, node, methods, data) {
    let arrayMethods = Object.create(Array.prototype);
    let newArrayProto = [];
    ['push', 'pop', 'shift', 'unshift', 'set', 'sort', 'reverse', 'removeAll', 'remove', 'limited'].forEach(function (method) {
        let original = arrayMethods[method];
        newArrayProto[method] = function () {
            if (method === 'set') {
                let key = arguments[0];
                let val = arguments[1];
                let idx = arguments[2];
                let ___node = arguments[3];
                if (data[value.__bind] && data[value.__bind][key] && data[value.__bind][key].node) {
                    let oldNode = data[value.__bind][key].node;
                    if (undefined !== idx) {
                        oldNode.setSiblingIndex(idx);
                    } else {
                        oldNode.setSiblingIndex(key);
                    }
                    deepCopy(val, data[value.__bind][key])
                } else {
                    let subNode;
                    if (!___node) {
                        subNode = cc.instantiate(prefab);
                        node.addChild(subNode);
                        subNode.active = true;
                    } else {
                        subNode = ___node;
                    }

                    if (undefined !== idx) {
                        subNode.setSiblingIndex(idx);
                    } else {
                        subNode.setSiblingIndex(key);
                    }
                    subNode.idx = key;
                    data[value.__bind][key] = val;
                    data[value.__bind][key].node = subNode;
                    mvvm(value.__itemView, data[value.__bind][key], methods, null, subNode);
                }
            } else if (method === 'remove') {
                let key = arguments[0];
                if (data[value.__bind] && data[value.__bind][key]) {
                    data[value.__bind][key].node.parent = null;
                    data[value.__bind][key].node.destroy();
                    data[value.__bind][key] = null;
                }
            } else if (method === 'removeAll') {
                if (data[value.__bind] && data[value.__bind].length > 0) {
                    for (let i = 0; i < data[value.__bind].length; i++) {
                        if (data[value.__bind][i] && data[value.__bind][i].node) {
                            data[value.__bind][i].node.parent = null;
                            data[value.__bind][i].node.destroy();
                            data[value.__bind][i] = null;
                        }
                    }
                }
            } else if (method === 'limited') {
                let limit = arguments[0];
                let valid = [];
                for (let i = 0; i < data[value.__bind].length; i++) {
                    if (data[value.__bind][i]) {
                        valid.push(i);
                    }
                }
                if (valid.length > 0 && valid.length > limit) {
                    let _delNum = valid.length - limit;
                    for (let i = 0; i < _delNum; i++) {
                        data[value.__bind][valid[i]].node.parent = null;
                        data[value.__bind][valid[i]].node.destroy();
                        data[value.__bind][valid[i]] = null;
                    }
                }
            }
        }
    });
    array.__proto__ = newArrayProto;

    if (!prefab) {

        for (let i = 0; i < node.children.length; i++) {

            let __sNode = node.children[i];
            array.set(i, array[i] || {idx:i}, i, __sNode);
        }
    } else {
        if (array.length) {
            for (let i = 0; i < array.length; i++) {
                array.set(i, array[i]);
            }
        }
    }
};

function registerAnimCallback(key, value, methods, node, event, cocosEvent) {

    let method;
    if (key === event) {
        let animation = node.getComponent(Animation);
        let valueType = typeof (value);
        if (valueType === 'string') {
            method = methods[value];
            animation.on(cocosEvent, method);
        }
        return true;
    }
}

function registerCallback(key, value, methods, node, event, cocosEvent, data) {
    let method;
    //abner

    if (key === event) {
        
        let valueType = typeof (value);       
        if (valueType === 'string') {
            method = methods[value];

            node.on(cocosEvent, function (...args) {

                method.call(node, node, ...args, data);
            });
        } else if (value.__params) {
            let func = methods[value.__func];
            node.on(cocosEvent, function (...args) {
                func.call(node, node, ...args, value.__params, data)
            }, this);
        }
        // bind(data,value,function(val, old){
        //     node.off(cocosEvent,method,this);
        //     if(val !== null){
        //         node.on(cocosEvent, val, this);
        //     }
        // });
        return true;
    }
}

function registerBindFunc(key, name, componentType, prop, value, data, methods, node) {
    let label;
    if (key === name) {
        label = node.getComponent(Label);
        if (methods[value.__func] && data[value.__bind]) {
            label[prop] = methods[value.__func](data[value.__bind]);
        }
        bind(data, value.__bind, function (val, old) {
            label[prop] = methods[value.__func](val, old);
        });
        return true;
    }
}

function action(key, value, data, methods, path, parent) {
    let node;
    if (path) {
        node = cc.find(path);
    } else if (path && parent) {
        node = cc.find(path, parent);
    } else if (!path && parent) {
        node = parent;
    }
    try {
        if (key === '__getter') {
            bind(data, value, function (val, old) {
                if (val === null) {
                    node.destroy();
                }
            });
            data[value] = node;
        } else if (key === '__holdSprites') {
            let holdSprites = node.getComponent('HoldSprites');
            data[value] = holdSprites;
        } else if (key === '__holdSprite') {
            let holdSprites = node.getComponent('HoldSprites');
            let sprite = node.getComponent(cc.Sprite);
            data[value] && (sprite.spriteFrame = holdSprites.get(data[value]));
            bind(data, value, function (val, old) {
                sprite.spriteFrame = holdSprites.get(val);
            });
        } else if (key === '__bind') {
            if (value.__func) {
                methods[value.__func](node, data[value.__field], data[value.__field], data);
            }
            bind(data, value.__field, function (val, old) {
                if (value.__func) {
                    methods[value.__func](node, val, old, data);
                }
            });
        } else if (key === '__audio') {
            let old = !!data[value];
            bind(data, value, function (val, old) {
                if (val) {
                    if (!closeMusicSwitch) {
                        let audio = node.getComponent(cc.AudioSource);
                        audio.play();
                    }
                }
            });
            data[value] = old;
        } else if (key === '__activeAnim') {
            let old = !!data[value];
            bind(data, value, function (val, old) {
                node.active = val;
                if (node.active) {
                    let anim = node.getComponent(cc.Animation);
                    anim.play();
                    anim.unscheduleAllCallbacks();
                    anim.scheduleOnce(() => {
                        node.active = false;
                    }, anim.defaultClip.duration);
                }
            });
            data[value] = old;
        } else if (key === '__dragonBone') {
            let old = !!data[value];
            bind(data, value, function (val, old) {
                if (val) {
                    let anim = node.getComponent(dragonBones.ArmatureDisplay);
                    anim.playAnimation(val.name, val.times);
                }
            });
            data[value] = old;
        } else if (key === '__anim') {

            let old = !!data[value];
            bind(data, value, function (val, old) {
                if (val) {
                    let anim = node.getComponent(cc.Animation);
                    anim.play(typeof (val) === 'string' ? val : undefined);

                }else{
                    let anim = node.getComponent(cc.Animation);
                    anim.stop();
                }
            });
            data[value] = old;
        } else if (key === '__initActive') {
            node.active = !!data[value];
        } else if (key === '__active') {
            if (value.__bind) {
                node.active = methods[value.__func](data[value.__bind]);
                bind(data, value.__bind, function (val, old) {
                    node.active = methods[value.__func](val);
                });
            }
            if (value instanceof Array) {
                let target = value[1];
                bind(data, value[0], function (val, old) {
                    node.active = val === target;
                });
                data[value[0]] = data[value[0]];
            } else {
                bind(data, value, function (val, old) {
                    node.active = val;
                });
                data[value] = data[value];
            }
        } else if (key === '__toggle') {
            let toggle = node.getComponent(Toggle);
            if (value.__isChecked) {
                toggle.isChecked = !!data[value.__isChecked];
                bind(data, value.__isChecked, function (val, old) {
                    if (val !== toggle.isChecked) {
                        toggle.isChecked = val;
                    }
                });
            }

            if (value.__func)
                toggle.node.on('toggle', function (event) {
                    methods[value.__func].call(this, event, data);
                }, this);
        } else if (key === '__fillRange') {
            let sprite = node.getComponent(cc.Sprite);
            if (sprite.type !== cc.Sprite.Type.FILLED) {
                throw new Error('__fillRange需要sprite type 为 FILLED');
            }

            sprite.fillRange = data[value] || 0;
            bind(data, value, function (val, old) {
                sprite.fillRange = val;
            });
        } else if (key === '__sprite') {
            let sprite = node.getComponent(Sprite);
            sprite.spriteFrame = data[value] || sprite.spriteFrame;
            if (!data[value]) {
                data[value] = sprite.spriteFrame;
            }
            bind(data, value, function (val, old) {
                sprite.spriteFrame = val;
            });
        } else if (key === '__spriteUrl') {
            let sprite = node.getComponent(Sprite);

            if (data[value] && data[value] !== '') {
                cc.loader.load({
                    url: data[value],
                    type: 'png'
                }, function (err, texture) {
                    try {
                        if (true === sprite.isValid) {
                            sprite.spriteFrame = new cc.SpriteFrame(texture);
                        }
                    } catch (e) {
                        console.log('e', e);
                        //sprite.spriteFrame = old;
                    }
                });
            }

            bind(data, value, function (val, old) {
                if (val !== '' && val !== old) {
                    cc.loader.load({
                        url: val,
                        type: 'png'
                    }, function (err, texture) {
                        if (!err) {
                            try {
                                if (true === sprite.isValid) {
                                    sprite.spriteFrame = new cc.SpriteFrame(texture);
                                }
                            } catch (e) {
                                console.log('e', e);
                                //sprite.spriteFrame = old;
                            }
                        }
                    });
                }
            });
            //  sprite.spriteFrame = data[value] || sprite.spriteFrame;
        } else if (key === '__getterSprite') {
            data[value] = node.getComponent(Sprite);
        } else if (key === '__subItemBindFunc') {
            node.on(value.__eventType, methods[value.__func]);
        } else if (key === '__list') {
            if (value.__prefab) {
                let prefab = cc.find(value.__prefab, node);
                prefab.active = false;
                prefab.parent = null;
                !data[value.__bind] && (data[value.__bind] = []);
                ArrayDuress(data[value.__bind], value, prefab, node, methods, data);
            } else if (value.__isStatic) {
                !data[value.__bind] && (data[value.__bind] = []);
                ArrayDuress(data[value.__bind], value, null, node, methods, data);
            }
        } else if (key === '__editBoxText') {
            let editBox = node.getComponent(EditBox);
            editBox.string = data[value] || editBox.string;
            node.on('text-changed', () => {
                data[value] = editBox.string;
            });
            bind(data, value, function (val, old) {
                editBox.string = val;
            });
        } else if (key === '__text' && !value.__bind) {
            let label = node.getComponent(cc.Label);
            label.string = data[value] || label.string;
            bind(data, value, function (val, old) {
                label.string = val;
            });
        } else if (key === '__color') {
            node.color = data[value] || node.color;
            bind(data, value, function (val, old) {
                node.color = val;
            });
        } else if (key === '__richText' && !value.__bind) {
            let _richText = node.getComponent(RichText);
            _richText.string = data[value] || _richText.string;
            bind(data, value, function (val, old) {
                _richText.string = val;
            });
        } else if (key === '__btnInteractable') {
            let button = node.getComponent(Button);
            bind(data, value, function (val, old) {
                button.interactable = val;
            });
        } else if (registerCallback(key, value, methods, node, '__onClick', 'click', data)) {

        } else if (registerBindFunc(key, '__text', Label, 'string', value, data, methods, node)) {

        } else if (registerCallback(key, value, methods, node, '__touchstart', 'touchstart', data)) {

        } else if (registerCallback(key, value, methods, node, '__touchmove', 'touchmove', data)) {

        } else if (registerCallback(key, value, methods, node, '__touchend', 'touchend', data)) {

        } else if (registerCallback(key, value, methods, node, '__touchcancel', 'touchcancel', data)) {

        } else if (registerCallback(key, value, methods, node, '__editing-return', 'editing-return', data)) {

        } else if (registerAnimCallback(key, value, methods, node, '__animFinished', 'finished')) {

        } else {
            let node;
            if (!path && !parent) {
                node = cc.find(key);
            } else if (parent && !path) {
                node = cc.find(key, parent);
            } else if (path && !parent) {
                node = cc.find(path + '/' + key);
            }
            let valueType = typeof (value);
            if (valueType === 'string') {
                let label = node.getComponent(cc.Label);
                if (!label) {
                    label = node.getComponent(cc.RichText);
                }
                label.string = data[value];
                bind(data, value, function (val, old) {
                    label.string = val;
                });
            } else if (valueType === 'object') {
                mvvm(value, data, methods, null, node);
            }
        }
    } catch (err) {
        console.error('err', err.stack, 'key:', key, 'value:', value, 'path:', path, 'parent', parent, 'node', node, 'data', data);
    }
}

module.exports = mvvm;