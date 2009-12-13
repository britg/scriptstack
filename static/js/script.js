
Stack.script = function (init_data) {
    if(typeof init_data != 'undefined') {
        this.bootstrap(init_data);
    }
};

Stack.script.prototype = {

    id: "",
    name: "",
    original_size: "",
    minified_size: "",

    bootstrap: function (params) {
        var _this = this;
        $.each(params, function (field, value) {
            _this[field] = value;
        });
    },

    render: function () {
        $('#scriptList').append(this.content);
    },

    serialize: function () {
        var _this = this;
        var _script = {};
        var props = ['id', 'name', 'original_size', 'minified_size'];

        $.each(props, function (i, property) {
            _script["script[" + property + "]"] = _this[property];
        });

        return _script;
    },

    del: function (cb) {
        var endpoint = '/scripts/delete';
        var data = this.serialize();

        $.post(endpoint, data, function () {
            cb.apply();
        });
    }

};
