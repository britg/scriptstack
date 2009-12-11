$(function() {

    /**
     * Stack title is editable.
     * On edit, make this stack publishable if it is
     * not already.
     */
    $('#stackTitle').editable(function (value, props) {
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

        if($input.val().match('Click here to edit')) {
            $input.focus(function() {
                this.select();
            });
        }

        $input.focus();
    });

});
