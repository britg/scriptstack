/**
 * Namespace for ScriptStack
 */
var Stack = function(params, no_save) {
    return new Stack.stack(params, no_save);
};

Stack.debug = true;
Stack.log = function() {
    if(Stack.debug) {
        console.log.apply(this, arguments);
    }
};

Stack.stack = function(params, no_save) {
    Stack.log(no_save);
    (no_save ? this.bootstrap(params) : this.update(params));
};

Stack.stack.prototype = {

    id: undefined,
    title: "",
    description: "",
    published: false,
    scripts: [],
    
    /**
     * Enable the publishing of this Stack.  Don't actually
     * publish, though.
     */
    enablePublish: function () {
        $('#stackPublish').attr('disabled', false)
            .click(function () {
                active_stack.publish();
            });
    },

    /**
     * Publish the stack and replace the Publish button
     * with the download sidebar.
     */
    publish: function () {
        this.published = true;
        this.persist(function () {
            window.location = '/stacks/' + active_stack.id;
        });
    },

    bootstrap: function(params) {
        Stack.log('Bootstrapping from', params);
        this.update(params, true);
    },

    /**
     * Update the direct properties of this stack and
     * persist the data to MongoDB
     */
    update: function(params, no_save) {
        var $this = this;
        $.each(params, function(field, value) {
            $this[field] = value;
        });

        if(typeof no_save == 'undefined') {
            this.persist();
        }
    },

    /**
     * Update the title and save immediately
     */
    update_title: function(title) {
        this.update({"title":title});
    },

    /**
     * Persist to db
     */
    persist: function (callback) {
        var $this = this;

        // try to find the id
        if(!this.id) {
            Stack.log('>> Attempting to find the stack id in the HTML', $('#stackId'));
            this.id = $('#stackId').val();
        }

        var endpoint = (this.id ? '/stacks/' + this.id : '/create');
        var data = {
            "stack[id]": this.id,
            "stack[title]": this.title,
            "stack[description]": this.description,
            "stack[published]": this.published
        };

        $.post(endpoint, data, function(resp) {
            if(!$this.id) {
                active_stack.id = resp.id;
                window.location = '#' + resp.id;
                active_stack.enablePublish();
            }

            if(typeof callback == 'function') {
                callback.apply();
            }
        }, 'json');
    }
};
