/**
 * mitt
 * @param {Map<string,Function[]>} all 
 * @returns 
 */
const mitt = (all = new Map()) => {
    return {
        all,
        /**
         * 订阅
         * @param {string} type 订阅的事件类型 
         * @param {Function} handler 处理函数
         * @returns {Function} 取消订阅的函数
         */
        on(type, handler) {
            //获取订阅处理函数
            const handlers = all.get(type);
            //添加处理函数
            const isAdded = handlers && handlers.push(handler)
            //初始设置该订阅
            if (!isAdded) all.set(type, [handler]);
            //返回取消订阅的函数
            return () => { this.off(type, handler) }
        },

        /**
         * 
         * @param {string} type 
         * @param {any[]} event 
         */
        emit(type, ...event) {
            //slice()浅拷贝数组,防止在执行监听器过程中，因动态添加 / 删除监听器而导致遍历异常。
            (all.get(type) || []).slice().map(handler => handler(...event))
        },

        /**
         * 取消订阅
         * @param {string} type 
         * @param {Function} handler 
         */
        off(type, handler) {
            const handlers = all.get(type);
            handlers && handlers.splice(handlers.indexOf(handler) >>> 0, 1)
        }
    }
}

export default mitt();