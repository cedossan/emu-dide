/*
 EMU-DIDE - Assembler module
 */

Assembler = (function() {
    'use strict';

    var pub = {}; //public symbols

    //DIDE instruction set, their format type, their token order and opcode
    var DIDE_INSTRUCTIONS = {
        'ADD': {
            format: 1, 
            opcode: 0x00, 
            tokensOrder: {regD: 1, regA : 2, regB : 3} 
            },
        'ADDI': {
            format: 2,
            opcode: 0x00,
            tokensOrder: {regD: 1, regA: 2, imm : 3} 
        },
        'SUB': {
            format: 1,
            opcode: 0x01,
            tokensOrder: {regD: 1, regA: 2, regB: 3}
        },
        'CMP': {
            format: 1, 
            opcode: 0x02,
            tokensOrder: {regD: undefined, regA: 1, regB: 2}
        }, 
        'CMPI': {
            format: 2, 
            opcode: 0x02,
            tokensOrder: {regD: undefined, regA: 1, regB: 2}
        },
        'AND': {
            format: 1,
            opcode: 0x04,
            tokensOrder: {regD: 1, regA : 2, regB : 3} 
        },
        'ANDI': {
            format: 2,
            opcode: 0x04,
            tokensOrder: {regD: 1, regA : 2, imm : 3}
        },
        'XOR': {
            format: 1, 
            opcode: 0x05,
            tokensOrder: {regD: 1, regA : 2, regB : 3}
        }, 
        'XORI': { 
            format: 2, 
            opcode: 0x05,
            tokensOrder: {regD: 1, regA : 2, imm : 3}         
        },
        'OR': {
            format: 1, 
            opcode: 0x06,
            tokensOrder: {regD: 1, regA : 2, regB : 3}         
        },  
        'ORI': {
            format: 2,
            opcode: 0x06,
            tokensOrder: {regD: 1, regA : 2, regB : 3}
        },
        'LUI': {
            format: 2, 
            opcode: 0x07,
            tokensOrder: {regD: 1, regA: undefined, regB: 2}
        },
        'SLL': {
            format: 2,
            opcode: 0x08,
            tokensOrder: {regD: 1, regA: 3, imm: 2}
        },
        'SAR': {
            format: 2, 
            opcode: 0x09,
            tokensOrder: {regD: 1, regA: 3, imm: 2}
        },
        'SLR': {
            format: 2,
            opcode: 0x0A,
            tokensOrder: {regD: 1, regA: 3, imm: 2}
        },
        'LOAD': {
            format: 2,
            opcode: 0x10,
            tokensOrder: {regD: 1, regA: 3, imm: 2}
        },
        'STORE': {
            format: 2,
            opcode: 0x11,
            tokensOrder: {regD: 1, regA: 3, imm: 2}
        },
        'BE': {
            format: 3,
            opcode: 0x18,
            tokensOrder: {imm: 1}
        },  
        'BGT': {
            format: 3,
            opcode: 0x19,
            tokensOrder: {imm: 1}
        },
        'BLE': {
            format: 3,
            opcode: 0x1A,
            tokensOrder: {imm: 1}
        }, 
        'BGTU': {
            format: 3, 
            opcode: 0x1B,
            tokensOrder: {imm: 1}
        },
        'BLEU': {
            format: 3,
            opcode: 0x1C,
            tokensOrder: {imm: 1}
        },
        'BA': {
            format: 3,
            opcode: 0x1D,
            tokensOrder: {imm: 1}
        },
        'BC': {
            format: 3, 
            opcode: 0x1E,
            tokensOrder: {imm: 1}
        },  
        'BO': {format: 3,
            opcode: 0x1F,
            tokensOrder: {imm: 1}
        }
    };

    var ASSEMBLER_DIRECTIVES = ['BYTE', 'WORD', 'DEFINE'];
    var EXECUTABLE_SIZE = 19456; // In 32-bit word
    var EXECUTABLE_BASE = 1024;  //In 32-bit word
    var REG_COUNT = 32;
    var SPACE_COMMA_SPLIT = /[\s,]+/;

    //Convert a register identifier to a number
    // like "R12" -> 12
    // do a simple cast if there is no character 
    function parseReg(identifier) {
        var firstChar = identifier.charAt(0);
        if(firstChar.toLowerCase() !== 'r') {
            return parseInt(identifier);
        } else {
            return parseInt(identifier.slice(1));
        }
    }

    //Parse the base + offset field for format type 2 instructions
    // Field is a string in the following format : "Offset(Rd)" or "Rd"
    // spit an object like that : { register : 2, offset : 4 }
    function parseBaseOffsetField(field) {
        var output = {register: undefined, offset: undefined};
        var parenPos = field.indexOf('(');

        if (parenPos === -1) {
            output.register = parseReg(field);
            output.offset = 0;
        } else {
            var offsetStr = field.substring(0, parenPos);
            var regStr = field.slice(parenPos, -1);
            output.offset = parseInt(offsetStr);
            output.register = parseReg(regStr);
        }

        return output;
    }


    //CodeEmitter object type 
    function CodeEmitter() {
        this.codeObj = new Uint32Array(EXECUTABLE_SIZE);
        this.cursor = 0;
    }

    //CodeEmitter methods
    CodeEmitter.prototype = {
        emitF1Instruction: function(opcode, regDest, regA, regB) {
            var word = 0;
            word |= (opcode  << 27);
            word |= (regDest << 26);
            word |= (regA    << 16);
            word |= (regB    << 11);
            this.codeObj[this.cursor] = word;
            this.cursor++;
        },
        emitF2Instruction: function(opcode, regDest, regA, imm) {
            var word = 0;
            word |= (opcode << 27);
            word |= (1 << 26);
            word |= (regDest << 21);
            word |= (regA    << 16);
            word |= imm;
            this.codeObj[this.cursor] = word;
            this.cursor++;            
        },
        emitF3Instruction: function(opcode, imm) {
           var word = 0;
           word |= (opcode << 27);
           word |= imm;
           this.codeObj[this.cursor] = word;
           this.cursor++;
        },
        emitWord: function(word) {
           this.codeObj[this.cursor] = word;
           this.cursor++;
        },
        getCodeObj: function() {
            return this.codeObj; 
        }
    };


    //Assemble a single line by manipulating the code
    //emitter 
    function assembleLine(emitter, line, index) {
        var tokens, 
            rDest,
            regA,
            regB;
        var colonPos = line.indexOf(':');

        if (colonPos !== -1) {
            //If there is label on the line, ignore it
            line = line.substr(colonPos + 1).trim();
        }

        if (!line) {
            return; //ignore empty lines
        }
        
        tokens = line.split(SPACE_COMMA_SPLIT);

        if (!_.has(DIDE_INSTRUCTIONS, tokens[0])) {
            throw new pub.AssemblerException(index, 'Unknown instruction ' + tokens[0]);
        }
        
        switch (DIDE_INSTRUCTIONS[tokens[0]].format) {
            case 1: // dest , rega , regb
                rDest = parseReg(tokens[DIDE_INSTRUCTIONS[tokens[0]].tokensOrder.regD]);
                regA  = parseReg(tokens[DIDE_INSTRUCTIONS[tokens[0]].tokensOrder.regA]);
                regB  = parseReg(tokens[DIDE_INSTRUCTIONS[tokens[0]].tokensOrder.regB]);
                
                if( rDest >= REG_COUNT || rDest < 0 || regA >= REG_COUNT || regA < 0 || 
                        regB >= REG_COUNT || regB < 0) {
                    throw new pub.AssemblerException(index, 'invalid register index');
                }
                
                emitter.emitF1Instruction(
                        DIDE_INSTRUCTIONS[tokens[0]].opcode,
                        rDest,
                        regA,
                        regB);
                break;
            case 2: // dest, rega, imm
                rDest = parseReg(tokens[DIDE_INSTRUCTIONS[tokens[0]].tokensOrder.regD]);
                var fieldData = parseBaseOffsetField(tokens[2]);
                
                if( rDest >= REG_COUNT || rDest < 0 || fieldData.register >= REG_COUNT ||
                        fieldData.register < 0) {
                    throw new pub.AssemblerException(index, 'invalid register index');
                } 
                
                if(fieldData.offset > 0xFFFF || fieldData.offset < 0) {
                    throw new pub.AssemblerException(index, 'invalid offset');
                }

                emitter.emitF2Instruction(
                        DIDE_INSTRUCTIONS[tokens[0]].opcode,
                        rDest,
                        fieldData.register,
                        fieldData.offset);
                break;
            case 3: // imm
                emitter.emitF3Instruction(
                        DIDE_INSTRUCTIONS[tokens[0]].opcode,
                        parseInt(tokens[1]));
                break;
            default:
                console.log('oops! Incorrect instruction format type');
                break;
        }
    }
    
    //Calculate and return the size in word of the given instruction line
    function calculateInstructionSize(line) {
        if(!line) {
            return 0;
        }
        
        var tokens = line.trim().split(SPACE_COMMA_SPLIT);
        console.log(line, tokens);
        if(_.has(DIDE_INSTRUCTIONS, tokens[0])) {
            return 1;
        } else if (tokens[0] === '.WORD') {
            return tokens.length - 1;
        }
        
    }
    
    //add the found label on the given line
    //to the 'labels' object.  
    //index should be the line number.
    //labelContext contains the memory cursor and the labels
    function getLabel(labelContext, line, index) {
        if (!line) {
            return; //ignore empty line
        }
        
        var colonPos = line.indexOf(':'),
                tokens,
                instruction;

        if (colonPos === -1) {
            labelContext.memCursor += calculateInstructionSize(line);
            return; //no label here, we still update the memoryCursor
        } else {
            instruction = line.substring(colonPos + 1);
            labelContext.memCursor += calculateInstructionSize(instruction);
        }
        
        //check if the label contains space
        tokens = line.substr(0, colonPos).split(' ');

        if (tokens.length > 2) {
            throw new pub.AssemblerException(index, 'Invalid label');
        } else if (_.has(DIDE_INSTRUCTIONS, tokens[0])) {
            throw new pub.AssemblerException(index, 'Label cannot use an instruction name');
        }else if (labelContext.labels.hasOwnProperty(tokens[0])) {
            throw new pub.AssemblerException(index, "Multiple definitions of label " + tokens[0]);
        } else {
            Object.defineProperty(labelContext.labels, tokens[0], {value: labelContext.memCursor});
        }
    }

    pub.AssemblerException = function(line, message) {
        this.line = line;
        this.message = message;
        this.toString = function() {
            return 'Assembly error at line ' + (this.line + 1) + ': ' + this.message;
        };
    };
 
    pub.assemble = function(sources) {
        //get an array of trimmed line, without comments
        var lines = _.map(sources.split('\n'), function(line) {
            var commentTokenPos = line.indexOf(';');
            if (commentTokenPos === -1)
                return line.trim();
            else
                return line.substr(0, commentTokenPos).trim();
        });

        var labelContext = { memCursor: EXECUTABLE_BASE, labels : {} };
        //label lookup
        _.each(lines, _.partial(getLabel, labelContext,  _));
        console.log(labelContext);
        
        //assembly phase
        var emitter = new CodeEmitter();
        _.each(lines, _.partial(assembleLine, emitter, _));
        console.log(emitter.getCodeObj());
        
        return emitter.getCodeObj();
    };

    return pub;
})();