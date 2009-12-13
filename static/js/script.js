
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
        $('#scriptList').append('<li id="' + this.id + '" class="scriptItem"><div class="scriptSummary"> <div class="scriptHandle">|||</div> <div class="scriptSize"> <span class="scriptOriginalSize">' + Math.round(this.original_size/1024) + '</span> / <span class="scriptMinSize">' + Math.round(this.minified_size/1024) + '</span> </div> <span class="scriptName">' + this.name + '</span> </div></li>');
    }
};
