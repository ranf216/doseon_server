module.exports =
{
    getRandomWord: function(minLen, maxLen, capFirstLetter = true)
    {
        let stats = [116,21,39,62,172,33,29,85,104,1,10,57,37,99,110,26,2,86,90,130,41,16,30,2,30,1];
        let letters = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
        let consts = "";
        let vowels = "";
    
        for (let i = 0; i < 26; i++)
        {
            let count = stats[i];
            let char = letters[i];
    
            for (let j = 0; j < count; j++)
            {
                if (char == "a" || char == "e" || char == "i" || char == "o" || char == "u")
                {
                    vowels += char;
                }
                else
                {
                    consts += char;
                }
            }
        }
    
    
        let len = this.rand(maxLen - minLen + 1) + minLen;
        let name = "";
    
        let selector = this.rand(2);
    
        for (let i = 0; i < len; i++)
        {
            let set = (selector == 0 ? consts : vowels);
            let place = this.rand(set.length);
            let char = set.substring(place, place + 1);
    
            if (capFirstLetter && $Utils.empty(name))
            {
                char = char.toUpperCase();
            }
    
            name += char;
    
            selector = (selector == 0 ? 1 : 0);
        }
    
        return name;
    },
    
    getRandomSentence: function(minLen, maxLen)
    {
        let len = this.rand(maxLen - minLen) + minLen;
        let text = "";
    
        while (text.length < len)
        {
            if ($Utils.empty(text))
            {
                text += this.getRandomWord(3, 7);
            }
            else
            {
                text += " " + this.getRandomWord(3, 7, false);
            }
        }
    
        text = text.substring(0, maxLen).trim();
    
        if (text.substring(text.length - 2, text.length - 1) == " ")
        {
            text = text.substring(0, text.length - 2);
        }
    
        return text;
    },

    getRandomParagraph: function(minSentenceLen, maxSentenceLen, minNumOfSentences, maxNumOfSentences)
    {
        let numOfSentences = this.rand(maxNumOfSentences - minNumOfSentences) + minNumOfSentences;

        let text = this.getRandomSentence(minSentenceLen, maxSentenceLen) + ".";

        for (let i = 1; i < numOfSentences; i++)
        {
            text += "\n" + this.getRandomSentence(minSentenceLen, maxSentenceLen) + ".";
        }

        return text;
    },

    getRandomImageBase64: function(width, height, type = "jpeg")
    {
        let img = new $Imaging(null, width, height, 3, this.getRandomColor(), "png");

        let minSize = 5;
        let maxWidth = width / 10;
        let maxHeight = height / 10;

        for (let i = 0; i < 100; i++)
        {
            let w = this.rand(maxWidth - minSize) + minSize;
            let h = this.rand(maxHeight - minSize) + minSize;
            let x = this.rand(width) - w;
            let y = this.rand(height) - h;

            imgIn = new $Imaging(null, w, h, 3, this.getRandomColor(), "png");
            img.copy(imgIn, x, y);    
        }

        return img.getBase64(type);
    },

    getRandomColor: function()
    {
        let r =  this.rand(255).toString(16);
        let g =  this.rand(255).toString(16);
        let b =  this.rand(255).toString(16);

        return "#" + (r.length == 1 ? "0" + r : r) + (g.length == 1 ? "0" + g : g) + (b.length == 1 ? "0" + b : b);
    },

    getRandomDate: function(startYear, endYear)
    {
        let d = this.rand(28) + 1;
        let m = this.rand(12) + 1;
        let y = this.rand(endYear - startYear) + startYear;
        return `${y}-${m}-${d}`;
    },

    rand: function(maxVal)
    {
        return Math.floor(Math.random() * maxVal);
    },

    getRequestParams(context)
    {
        let vals = [];

        Object.entries(context).forEach(function(item)
        {
            let prop = item[0];
            let val = item[1];

            if (prop.startsWith("$") && prop != "$Session")
            {
                vals[prop.substring(1)] = val;
            }
        });

        return vals;
    },
}
