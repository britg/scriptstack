
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

    update_tags: function (tags) {
        var _this = this;
        var tagsArr = tags.split(',');
        $.each(tagsArr, function (i, v) {
            tagsArr[i] = $.trim($.stripTags(v));
        });

        var endpoint = '/scripts/tags';
        var data = {
            "script[id]": this.id,
            "script[tags]": tagsArr.join(',')
        }
        $.post(endpoint, data, function (resp) {
            var tagField = $('#' + _this.id).find('.scriptTags');
            tagField.html(resp.tags.join(', '));
        }, 'json');
    },

    del: function (cb) {
        var endpoint = '/scripts/delete';
        var data = this.serialize();

        $.post(endpoint, data, function () {
            cb.apply();
        });
    }

};
