
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
    content: "",

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

    update_name: function (name) {
        var _this = this;
        var endpoint = '/scripts/name';
        var data = {
            "script[id]": this.id,
            "script[name]": name
        };
        $.post(endpoint, data, function (resp) {
            var filename = $('#' + _this.id).find('.scriptName');
            filename.html(resp.name);
        }, 'json');

    },

    del: function (cb) {
        var endpoint = '/scripts/delete';
        var data = this.serialize();

        $.post(endpoint, data, function () {
            cb.apply();
        });
    },

    toggle_code: function () {
        var _this = this;
        var li = $('#' + this.id);
        var code = li.find('code');

        if(li.find('.scriptCode').is(':visible')) {
            _this.hide_code();
        } else {
            if(!('SyntaxHighlighter' in window)) {
                $.beautyOfCode.init({
                    brushes:['JScript'],
                    ready: function () {
                        _this.show_code();
                    }
                });
            } else {
                _this.show_code();
            }
        }
    },

    show_code: function () {
        var li = $('#' + this.id);
        var pre = li.find('pre.code');
        var code = li.find('code');

        if(code.length > 0) {
            if(code.is(':empty')) {
                code.html(this.content);
            }

            pre.beautifyCode('javascript');
            li.find('.scriptCode').show();
        } else {
            li.find('.scriptCode').show();
        }
    },

    hide_code: function () {
        var li = $('#' + this.id);
        li.find('.scriptCode').hide();
    }

};
