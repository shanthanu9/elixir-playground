import { create } from "domain";

//TODO: CRDT and queue of jobs

//Assuming single character insertion and deletion (TODO: Multichar)
//Ignored Enter
//No undo feture

/**
 * API:
 *
 * crdt.local_insert(char, lineNumber, pos)
 * crdt.local_delete(lineNumber, pos)
 * crdt.render_line(lineNumber)
 * crdt.remote_insert(Character, lineNumber)
 * crdt.remote_delete(Character, lineNumber)
 */

class Identifier {
    /**
     * An `Identifier` identifies the position of a `ch` in a `character`
     * @param  {Number} position
     * @param  {Number} siteID
     */
    constructor(position, siteID) {
        this.position = position;
        this.siteID = siteID;
    }
    
    /**
     * If `this` == `identifier`
     * @param  {Identifier} identifier
     * @param  {Boolean}    site=true
     */
    isEqualTo(identifier, site=true) {
        if(site) return (this.position == identifier.position && this.siteID == identifier.siteID);
        else return (this.position == identifier.position);
    }
    
    /**
     * If `this` > `identifier`
     * Based on position, ties broken by siteID
     * @param  {Identifier} identifier
     */
    isGreaterThan(identifier) {
        if(this.position > identifier.position) return true;
        if(this.position < identifier.position) return false;
        return this.siteID > identifier.siteID;
    }

    /**
     * If `this` < `identifier`
     * Based on position, ties broken by siteID
     * @param  {Identifier} identifier
     */
    isLesserThan(identifier) {
        return (!this.isEqualTo(identifier) && !this.isGreaterThan(identifier));;
    }

    toString() {
        return `[${this.position}, ${this.siteID}]`;
    }
}

/**
 * Converts 2 element list to identifier list
 * @param  {List{List[2]}} list=[]
 */
function createIdentifierList(list = []) {
    var identifierList = []
    for(let l of list) {
        identifierList.push(new Identifier(l[0], l[1]));
    }
    return identifierList;
}

function parseIdentifiers(list = []) {
    var identifierList = []
    for(let l of list) {
        identifierList.push(new Identifier(l.position, l.siteID))
    }
    return identifierList;
}

//NOTE: Element would be a better name
class Character {
    /**
     * Each `Character` of CRDT data structure
     * @param  {Char}   ch
     * @param  {List{Identifier}} identifiers
     */
    constructor(ch, identifiers) {
        this.ch = ch;
        this.identifiers = identifiers;
    }
    
    /**
     * If `this` == `character`
     * @param  {Character} character
     * @param  {Boolean}   site
     */
    isEqualTo(character, site=true) {
        if(this.ch != character.ch) return false;
        if(this.identifiers.length != character.identifiers.length) return false;
        for(let i = 0; i < this.identifiers.length; i++) {
            var i1 = this.identifiers[i];
            var i2 = character.identifiers[i];
            if(!i1.isEqualTo(i2, site)) {
                return false;
            }
        }
        return true;
    }

    /**
     * If `this` > `character`
     * Based on `identifiers`
     * @param  {Character} character
     */
    isGreaterThan(character) {
        var len = Math.min(this.identifiers.length, character.identifiers.length);
        for(let i = 0; i < len; i++) {
            var i1 = this.identifiers[i];
            var i2 = character.identifiers[i];
            if(i1.isEqualTo(i2)) continue;
            if(i1.isGreaterThan(i2)) return true;
            else return false;
        }
        if(this.identifiers.length > character.identifiers.length) return true;
        else return false;
    }

    /**
     * Pushes `identifier` to `this.identifiers`
     * @param  {Identifer} identifier
     */
    pushIdentifier(identifier) {
        this.identifiers.push(identifier);
    }

    toString() {
        var output = `{${this.ch}: [`;
        for(let i = 0; i < this.identifiers.length; i++) {
            output += this.identifiers[i].toString();
            if(i < this.identifiers.length-1)
                output += ', ';
        }
        output += ']}';
        return output;
    }
}

class CRDT {
    /**
     * Conflict-Free Replicated Data Type on each client side
     * @param  {List{Character}} data=[]
     */
    constructor(data = [
            [new Character('', createIdentifierList([[0, -1]])), new Character('', createIdentifierList([[1, Infinity]]))]
        ]) {
        this.data = data;
        // this.data[0].push(new Character('', createIdentifierList([0, -1])));
        // this.data[0].push(new Character('', createIdentifierList([1, Infinity])));
        console.log(this.data)
        // for(let i = 0; i < data.length; i++) {
        //     this.data.push([]);
        //     this.data[i].push(new Character('', createIdentifierList([0, -1], [1, Infinity])))  
        // }
    }

    /**
     * Insert `ch` at line `lineNumber` and position `pos` by `siteID`
     * Enters at `pos`, characters after `pos` are shifted ahead
     * @param  {Char}   ch
     * @param  {Number} lineNumber
     * @param  {Number} pos
     * @param  {Number} siteID
     * @result {Character}
     */
    localInsert(ch, lineNumber, pos, siteID) {

        pos = pos + 1;
        // if(ch == '') {
        //     this.data.push([]);
        //     return new Character('', [[]]);
        // }

        var len = this.data[lineNumber].length;

        //Find prev and next Identifiers (assuming imaginary first and last characters)
        // var prevIdentifierList = ((pos != 0) ? this.data[lineNumber][pos-1].identifiers : createIdentifierList([[0, -1]]));
        var prevIdentifierList = this.data[lineNumber][pos-1].identifiers;
        // var nextIdentifierList = ((pos != len) ? this.data[lineNumber][pos].identifiers : createIdentifierList([[1, Infinity]]));
        var nextIdentifierList = this.data[lineNumber][pos].identifiers;
        
        var maxLen = Math.max(prevIdentifierList.length, nextIdentifierList.length);
        var insertCharacter = new Character(ch, []);
        
        //Keep track of siteID before current Identifier
        var lastPrevSiteID = -1;
        var lastNextSiteID = Infinity;

        //Keeps track if the identifierList is found
        var identifierListFound = false;
        //Keeps track if next greater identifier of prev identifier is being found out
        var findNextGreaterIdentifier = false;

        //Iterate over prev and next Identifier and get IdentifierList of `insertCharacter`
        for(let i = 0; i < maxLen; i++) {
            //TODO: Check this
            var prevIdentifier = ((i < prevIdentifierList.length) ? prevIdentifierList[i] : new Identifier(0, lastPrevSiteID));
            var nextIdentifier = ((i < nextIdentifierList.length) ? nextIdentifierList[i] : new Identifier(0, lastNextSiteID));
            
            if(!findNextGreaterIdentifier) {
                if(prevIdentifier.position < nextIdentifier.position) {
                    //Being greedy on size of identifier list
                    if(siteID > prevIdentifier.siteID && prevIdentifier.siteID != -1) { //TODO: check if ch is same? idempotency?
                        //If by siteID alone identifier order can be obtained, then push and done!
                        //Edge case of first character inserted in line handled by 2nd condition
                        insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, siteID));
                        identifierListFound = true;
                    }
                    else if(prevIdentifier.positon + 1 < nextIdentifier.position) {
                        //If there is atleast a gap of 2 between prevIdentifier and nextIdentifier, take
                        //prevIdentifier.position+1 and done!
                        insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position+1, siteID));
                        identifierListFound = true;
                    }
                    else { //prevIdentifier.position + 1 == nextIdentifier.position
                        //IdentifierList lesser than nextIndetifierList is found;
                        //Next find IdentifierList greater than prevIdentifier
                        insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, prevIdentifier.siteID));
                        findNextGreaterIdentifier = true;
                    }
                }
                else { //prevIdentifier.position == nextIdentifer.position
                    //NOTE: prevIdentifier.siteID < nextIdentifier.siteID
                    if(prevIdentifier.siteID < siteID && siteID < nextIdentifier.siteID) {
                        //By siteID alone order can be obtained, then push and done!
                        insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, siteID));
                        identifierListFound = true;
                    }
                    else {
                        //Positions are same and siteIDs don't help in ordering. Have to go ahead
                        insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, prevIdentifier.siteID));
                    }
                }
            }
            else {
                //IdentifierList is already less then nextIdentifierList;
                //This section finds IdentifierList greater than prevIdentifierList
                if(siteID > prevIdentifier.siteID) {
                    //By siteId alone order can be obtained, then push and done!
                    insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, siteID));
                    identifierListFound = true;
                }
                else if(prevIdentifier.position < 9) {
                    //If prevIdentifier.position is not 9, then can always add 1 to position, push and done!
                    insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position+1, siteID));
                    identifierListFound = true;
                }
                else { //prevIdentifier.position == 9
                    //If prevIdentifier.position is 9, then have to go ahead
                    insertCharacter.pushIdentifier(new Identifier(prevIdentifier.position, prevIdentifier.siteID));
                }
            }

            lastPrevSiteID = prevIdentifier.siteID;
            lastNextSiteID = nextIdentifier.siteID;

            if(identifierListFound) break;
        }

        if(!identifierListFound) {
            insertCharacter.pushIdentifier(new Identifier(1, siteID));
            identifierListFound = true;
        }

        //insert new Character to CRDT and return it
        this.data[lineNumber].splice(pos, 0, insertCharacter);
        return insertCharacter;
    }

    localInsertNewline(lineNumber, pos) {
        pos = pos + 1;
        var retCharacter = this.data[lineNumber][pos];
        var beginCharacter = new Character('', createIdentifierList([[0, -1]]));
        var endPosition = this.data[lineNumber][pos-1].identifiers[0].position+1; //position one more than of the last element in the line after inserting new line
        var endCharacter = new Character('', createIdentifierList([[endPosition, Infinity]]));
        
        //Inserts a new line at lineNumber+1, `splices` out characters after `pos` (inclusive)
        //in this.data[lineNumber] to this.data[lineNumber+1] (splice returns the removed part)
        this.data.splice(lineNumber+1, 0, this.data[lineNumber].splice(pos));
        this.data[lineNumber].push(endCharacter);
        this.data[lineNumber+1].unshift(beginCharacter);
        return retCharacter;
    }

    /**
     * Delete `character` at line `lineNumber` and position `pos`
     * @param  {Number} lineNumber
     * @param  {Number} pos
     * @result {Character}
     */
    localDelete(lineNumber, pos) {
        pos = pos + 1;
        var tempCharacter = this.data[lineNumber][pos];
        this.data[lineNumber].splice(pos, 1);
        return tempCharacter;
    
    }

    /**
     * Deletes new line at the end of line `lineNumber`.
     * Merges line `lineNumber+1` at the end of `lineNumber`
     * @param  {Number} lineNumber
     */
    localDeleteNewline(lineNumber) {
        //Remove the 'terminating' character of line `lineNumber`
        // console.log(`current line: ${this.data[lineNumber]}`)
        var endCharacter = this.data[lineNumber].pop();
        // console.log(`current line: ${this.data[lineNumber]}`)
        var endIdentifier = endCharacter.identifiers[0];
        var retCharacter = this.data[lineNumber][-1]; //Return character will be the last character in `lineNumber`
        var lineToMerge = this.data.splice(lineNumber+1, 1)[0]; //Remove line `lineNumber+1`.
        lineToMerge.shift(); //Remove 'starting' character from line to be merged
        // console.log(`lineToMerge: ${lineToMerge}`);
        //Merge `lineToMerge` to line `lineNumber` by offseting each character in `lineToMerge`
        for(var character of lineToMerge) {
            var modifiedCharacter = character;
            for(var ctr = 0; ctr < modifiedCharacter.identifiers.length; ctr++) {
                modifiedCharacter.identifiers[ctr].position += endIdentifier.position;    
            }
            // modifiedCharacter.identifiers[0].position += endIdentifier.position;
            this.data[lineNumber].push(modifiedCharacter);
        }
        return retCharacter;
    }

    /**
     * Insertions directly to CRDT
     * Returns editor compliant line
     * @param  {Character} character
     * @param  {Number}    lineNumber
     * @result {string}
     */
    remoteInsert(character, lineNumber) { //Binary search insertion [pointless since splice will be O(n)]
        var cchar = new Character(character.ch, parseIdentifiers(character.identifiers));
        var characters = this.data[lineNumber];
        var pos;
        for(pos = 0; pos < characters.length; pos++) {
            var c = characters[pos];
            if(!cchar.isGreaterThan(c)) break;
            // if(character.isGreaterThan(c)) continue; //character == c doesn't make sense since it's like duplicate simultaneous insertion by the same user
        }
        this.data[lineNumber].splice(pos, 0, cchar);
    }
    
    remoteInsertNewline(character, lineNumber) {
        var cchar = new Character(character.ch, parseIdentifiers(character.identifiers));
        var characters = this.data[lineNumber];
        var pos;
        for(pos=0; pos<characters.length; pos++) {
            var c = characters[pos];
            if(!cchar.isGreaterThan(c)) break;
        }
        var beginCharacter = new Character('', createIdentifierList([[0, -1]]));
        var endCharacter = new Character('', createIdentifierList([[1, Infinity]]));
        this.data.splice(lineNumber+1, 0, this.data[lineNumber].splice(pos));
        this.data[lineNumber].push(endCharacter);
        this.data[lineNumber+1].unshift(beginCharacter);
    }

    /**
     * Deletions directly to CRDT
     * Returns editor compliat line
     * @param  {Character} character
     * @param  {Number}    lineNumber
     * @result {string}
     */
    remoteDelete(character, lineNumber) {
        var cchar = new Character(character.ch, parseIdentifiers(character.identifiers))
        for(let pos = 0; pos < this.data[lineNumber].length; pos++) {
            var c = this.data[lineNumber][pos];
            // if(c.isEqualTo(character)) {
            if(c.isEqualTo(cchar)) {
                this.data[lineNumber].splice(pos, 1);
            } 
        }
    }

    
    /**
     * Converts a line of CRDT into editor compliant line
     * @param  {Number} lineNumber
     */
    getUpdatedLine(lineNumber) {
        var characters = this.data[lineNumber];
        var lineString = ""; 
        for(let c of characters) {
            lineString += c.ch;
        }
        return lineString;
    }

    /**
     * Get string representation of `this`.
     * Useful for debugging.
     */
    toString() {
        var output = "";
        for(let i = 0; i < this.data.length; i++) {
            for(let j = 0; j < this.data[i].length; j++) {
                var character = this.data[i][j];
                output += character.toString();
                if(j < this.data[i].length-1)
                    output += ", "  
            }
            output += "\n"
        }
        return output;
    }
}

// var testCharacter = new Character('a', createIdentifierList([[1,1], [5,2]]));
// var testCharacter1 = new Character('a', createIdentifierList([[1,1], [5,3]]));
// console.log(testCharacter.isGreaterThan(testCharacter1));

var crdt = new CRDT();

export default crdt