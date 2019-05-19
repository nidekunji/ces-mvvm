/**
 * @author ljy
 * @description 每个场景入口文件
 * 
 */
cc.Class({
    extends: cc.Component,

    properties: {
        
    },

    onLoad () {
        let toy = require('toy')(Date.now());
        this.toy = toy;
        require('main')(toy);
    },

    start () {

    },

    // update (dt) {},
});
