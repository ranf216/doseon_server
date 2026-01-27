Array.prototype.toPlaceholders = function()
{
    return new Array(this.length).fill("?").join(",");
};

module.exports = {};
