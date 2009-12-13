$(function() {

    /**
     * Stack title is editable.
     * On edit, make this stack publishable if it is
     * not already.
     */
    $('#stackTitle').editable(function (value, props) {
        // scrub value of any tags
        value = $.stripTags(value);

        // Remove unedited flag
        $(this).removeClass('unedited');

        // Initiate the stack if it is not already
        if(typeof window.active_stack == 'undefined') {
            window.active_stack = Stack({"title":value}); 
        } else {
            active_stack.update_title(value);
        }

        return value;
    }, {
        "cssclass":"editing",
        "style":"inherit"
    });

    /**
     * Listen for the editable event. If the default message is 
     * still in place, select the entire input.
     */
    $('#stackTitle').bind('click.editable', function() {
        var $input = $('input', this);

        if($input.val().match('Click here to')) {
            $input.focus(function() {
                this.select();
            });
        }

        $input.focus();
    });

    /**
     * Show a confirmation dialog.  On true, POST to delete
     * URL and redirect somewhere
     */
    $('.deleteStack').click(function () {
        var cfm = confirm("Are you sure you want to permanently delete this stack?");
        if(cfm) {
            active_stack.del(function () {
                window.location = '/';
            });
        }

        return false;
    });

    $('#newScriptButton').click(function () {
        $(this).hide();
        $('#newScript').show();
    });

    $('#newScriptCancel').click(function () {
        $('#newScript').hide();
        $('#newScriptButton').show();
    });

    /**
     * Create a new AjaxUpload instance and bind it to the upload button
     */
    new AjaxUpload('#uploadInput', {
        action:"/scripts/upload",
        responseType:'json',
        onSubmit: function () {
            if(typeof active_stack == 'undefined') {
                window.active_stack = Stack();
            } else {
                this.setData({
                    stack_id: active_stack.id
                });
            }
        },
        onComplete: function (name, resp) {
            active_stack.new_script_upload(resp.script);
        }
    });

    /**
     * If there's a file in the upload input, ajaxUpload that,
     * else if there's a URL in the url input, ajax call to process that URL
     * else if there's a block of text pasted, post that.
     */
    $('#newScriptSubmit').click(function () {

        var methods = ['url', 'paste'];
        var method;

        $.each(methods, function (i, v) {
            if($('#' + v + 'Input').val().length > 0) {
                method = v;
                return false;
            }
        });

        Stack.log('>> New script method is:', method);

        if(typeof method == 'undefined') {
            Stack.log('No input is non-empty.  Doing nothing!');
            return;
        }

        if(typeof active_stack == 'undefined') {
            window.active_stack = Stack();
        }

        active_stack.new_script(method);

        $('#newScriptButton').show();
        $('#newScript').hide();

    });

    /**
     * Scripts are sortable
     */
    $('#scriptList').sortable({
        containment: 'parent',
        handle:'.scriptHandle'
    });

    /**
     * Open the script on click
     */
    $('.scriptName').live('click', function() {
        var li = $(this).parent().parent()
        li.toggleClass('selected');

        var detail = li.find('.scriptDetail');
        detail.toggle();
    });

    /**
     * Syntax highlighting
     */
    $.beautyOfCode.init({
        brushes: ['JScript']
    });


    /**
     * Delete script
     */
    $('.deleteScript').live('click', function() {
        var cfm = confirm("Remove this script?");
        if(cfm) {
            var scriptId = $(this).attr('href').split('/')[3];
            active_stack.get_script(scriptId, function(script) {
                script.del(function() {
                    $('#' + scriptId).remove();
                });
            });
        }

        return  false;
    });

    /**
     * Filename field edit
     */
    $('.scriptNameEdit').live('change', function () {
        var scriptId = $(this).attr('id').split('-')[1];
        var filename = $(this).val();

        active_stack.get_script(scriptId, function (script) {
            script.update_name(filename);
        });
    });

    /**
     * Tag edit field
     */
    $('.scriptTagsEdit').live('change', function () {
        var scriptId = $(this).attr('id').split('-')[1];
        var tags = $(this).val();

        active_stack.get_script(scriptId, function (script) {
            script.update_tags(tags);
        });
    });

});
