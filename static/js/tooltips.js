
$(function() {
    $('#uploadInput').qtip({
        content:"Only files with .js extensions will be uploaded."
    });

    $('.scriptSize, .stackSize').qtip({
            content:"Minified size on the left.  Raw size on the right."
    });
});
