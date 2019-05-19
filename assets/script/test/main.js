/**
 * @author ljy
 * @description 功能模块/哪个页面需要用到就require
 * @time 
 */

let mvvm = require('mvvm');
let view = {
    '/Canvas/ui': {
        __active: 'mainUIActive',
        __getter: 'uiNode',
        'button': {
            __onClick: 'hideMainUI',
        },
        'label': {
            __text: 'txt',
        },
        'img': {
            __sprite: 'imgSprite',
        },
    }
};

module.exports = function (toy) {
    let _test = toy.system('TestSystem', 100);   

    let data = {
        mainUIActive: true,
    };

    let methods = {
        hideMainUI: () => {
            //data.mainUIActive = false;
            data.txt = '123';
        },        
    };
    mvvm(view,data,methods);
}