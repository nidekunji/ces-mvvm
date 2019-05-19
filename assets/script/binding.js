function bind(obj, key, func) {
    console.log(obj, key, func);
    let desc = Object.getOwnPropertyDescriptor(obj, key);
    let store;
    let set;
    if (desc && desc.set) {
        store = desc.set.__store__;
        store.push(func);
    } else {
        store = [];
        set = function (val) {
            let oldVal = set.__value__;
            set.__value__ = val;
            for (let i = 0; i < store.length; i++) {
                let func = store[i];
                func(val, oldVal);
            }
        };
        set.__store__ = store;
        store.push(func);
        set.__value__ = obj[key];
        Object.defineProperty(obj, key, {
            get: function () {
                return set.__value__;
            },
            set
        });
    }
}


module.exports.bind = bind;
