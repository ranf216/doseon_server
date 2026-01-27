module.exports = class
{
    constructor(rawNotes = null)
    {
        this.notes = ($Utils.empty(rawNotes) ? {} : JSON.parse(rawNotes));
        this.isChanged = false;
    }

    getRawData()
    {
        return JSON.stringify(this.notes);
    }

    getNotes(type = null)
    {
        if (type === null)
        {
            return $Utils.clone(this.notes);
        }

        if (!$Utils.isset(this.notes[type]))
        {
            return [];
        }

        return $Utils.clone(this.notes[type]);
    }

    getNotesFlat()
    {
        let notes = [];

        Object.entries(this.notes).forEach(function(noteObj)
        {
            let typeNotes = noteObj[1];
            notes = notes.concat(typeNotes);
        });

        return notes;
    }

    addNote(type, note)
    {
        if ($Utils.empty(type) || $Utils.empty(note))
        {
            return false;
        }

        if (!$Utils.isset(this.notes[type]))
        {
            this.notes[type] = [];
        }

        this.notes[type].push(note);
        this.isChanged = true;

        return true;
    }

    isChanged()
    {
        return this.isChanged;
    }
}
