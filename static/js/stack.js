jQuery.stripTags = function(str) { return str.replace(/<\/?[^>]+>/gi, '');  };

/**
 * Namespace for ScriptStack.
 * Also, returns a new Stack instance on
 * call.
 */
var Stack = function (params) {
    return new Stack.stack(params);
};

Stack.working = function () {
    if(typeof window.current_gritter_id == 'undefined') {
        window.current_gritter_id = $.gritter.add({
            "title": "Working...",
            "text":"work, work"
        });
    }
};

Stack.doneWorking = function () {
    if(typeof window.current_gritter_id != 'undefined') {
        $.gritter.remove(window.current_gritter_id, {
            fade:true,
            speed:'fast'
        });
        delete window.current_gritter_id;
    }
};

/**
 * Bootstrap an existing stack from paramters passed
 * on page.
 */
Stack.bootstrap = function(params) {
    return new Stack.stack(params, true);
};

/**
 * Debugging is enable by default
 */
Stack.debug = true;
Stack.log = function () {
    if(Stack.debug) {
        console.log.apply(this, arguments);
    }
};

/**
 * The stack can either be created or bootstrapped from existing
 * data that's appended to the html in a script tag.
 */
Stack.stack = function (params, bootstrap) {
    if(typeof params != 'undefined') {
        (bootstrap ? this.bootstrap(params) : this.update(params));
    }
};

Stack.stack.prototype = {

    id: undefined,
    title: "",
    published: false,
    publishable: false,
    scripts: [],
    script_col: {},

    /**
     * Convert this stack into a POSTable object
     */
    serialize: function () {
        var _this = this;
        var _stack = {};
        var props = ['id', 'title', 'published'];

        $.each(props, function (i, property) {
            if(typeof _this[property] != 'undefined') {
                _stack["stack[" + property + "]"] = _this[property];
            }
        });

        return _stack;
    },

    /**
     * Persist to db
     */
    persist: function (callback) {
        var _this = this;

        // try to find the id
        if(!this.id) {
            Stack.log('>> Attempting to find the stack id in the HTML', $('#stackId'));
            this.id = $('#stackId').val();
        }

        var endpoint = (this.id ? '/stacks/' + this.id : '/create');
        var data = this.serialize();
            
        $.post(endpoint, data, function (resp) {
            if(!_this.id) {
                _this.id = resp.id;
                window.location = '#' + resp.id;
                _this.enablePublish();
            }

            if(typeof callback == 'function') {
                callback.apply();
            }
        }, 'json');
    },
    
    /**
     * Enable the publishing of this Stack.  Don't actually
     * publish, though.
     */
    enablePublish: function () {
        this.publishable = true;
        $('#publishWrap').fadeIn();
    },

    /**
     * Publish the stack and replace the Publish button
     * with the download sidebar.
     */
    publish: function () {
        var _this = this;

        if(!this.publishable) {
            return;
        }

        this.published = true;
        this.persist(function () {
            window.location = '/stacks/' + _this.id;
        });
    },

    bootstrap: function (params) {
        Stack.log('Bootstrapping from', params);
        this.update(params, true);
    },

    /**
     * Update the direct properties of this stack and
     * persist the data to MongoDB
     */
    update: function (params, no_save) {
        var _this = this;
        $.each(params, function (field, value) {
            _this[field] = value;
        });

        if(typeof no_save == 'undefined') {
            this.persist();
        }
    },

    /**
     * Shortcut to update title
     */
    update_title: function (title) {
        this.update({"title":title});
    },

    /**
     * Destroy this Stack
     */
    del: function (cb) {
        var endpoint = '/stacks/delete';
        var data = this.serialize();

        $.post(endpoint, data, function () {
            cb.apply();
        });
    },

    /**
     * Overload new_script by method call
     */
    new_script: function (method) {
        if(typeof this['new_script_' + method] != 'undefined') {
            return this['new_script_' + method].apply();
        } else {
            Stack.log('No script creation method that matches', method);
        }
    },

    /**
     * Use ajaxUpload jQuery plugin to asynchronously upload the file.
     * If the upload is successful, instantiate a new Stack.script object
     * with the properties returned from the upload
     */
    new_script_upload: function (data) {
        var script = new Stack.script(data);
        script.render();
        $('#newScriptCancel').click();
        $('#' + script.id).find('.scriptSummary').click();
        this.update_summary();
    },

    /**
     * Asynchrously get a script from the script collection
     * or from the server if it doesn't exist
     */
    get_script: function (id, cb) {
        var _this = this;
        if(typeof this.script_col[id] == 'undefined') {
            $.getJSON('/scripts/' + id, function(resp) {
                var script = new Stack.script(resp);
                _this.script_col[id] = script;
                cb.apply(_this, [script]);
            });
        } else {
            cb.apply(_this, [_this.script_col[id]]);
        }
    },

    /**
     * Submit the script order on sort change
     */
    sort: function () {
        var _this = this;
        _this.scripts = [];

        $('#scriptList').find('li').each(function (i, li) {
            _this.scripts.push($(li).attr('id'));
        });

        var endpoint = '/stacks/sort';
        var data = {
            "stack[id]":this.id,
            "stack[scripts]":this.scripts.join(',')
        };

        $.post(endpoint, data, function (resp) {
            Stack.log(resp);
        });
        
        Stack.log(_this.scripts);
    },

    /**
     * Update the number of scripts and the total sizes
     */
    update_summary: function () {
        var num_scripts = $('#scriptList').find('li').length;
        var original_size = 0, minified_size = 0;
        
        $('.scriptMinActual').each(function (i, v) {
            minified_size += Number($(v).val())/1024
        });

        $('.scriptOriginalActual').each(function(i, v) {
            original_size += Number($(v).val())/1024
        });

        $('#numScripts').html(num_scripts);
        $('.stackMinSize').html(Math.round(minified_size));
        $('.stackOriginalSize').html(Math.round(original_size));
    }
};
