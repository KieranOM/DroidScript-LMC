app.SetOrientation("Portrait");

//Variables for colour referencing
var green = "#5cb85c";
var blue = "#1461ac";
var darkblue = "#000080";
var red = "#d9534f";
var orange = "#f7941f";
var white = "#ffffff";
var grey = "#F0F0F1";
var black = "#333333";

//Empty lists in the format [[LABEL], [OPCODE], [OPERAND],  [DROIDSCRIPT_LAYOUT]]
var commands = [[],[],[], []];

//LMC/Von Neumann Simulation Variables
var accumulator = 0;
var programCounter = 0;
var memoryAddressRegister = 0;
var memoryDataRegister = 0;
var currentInstructionRegister = [[],[],[]];
var memory = [[], [], []];
var memoryBlocks = [0, 0, 0, 0, 0, 0, 0, 0];
var memoryBlockMap = {};

//Called when application is started.
function OnStart()
{
    precachePopups();
	//Create a layout with objects vertically centered.
	lay = app.CreateLayout( "linear", "FillXY" );
	lay.SetBackColor( white );
	
	headerLayout = app.CreateLayout("linear", "Horizontal,VCenter,FillX");
	headerLayout.SetPadding(0, 0.01, 0, 0.01);
	headerLayout.AddChild( createHeader("Label") );
	headerLayout.AddChild( createHeader("Opcode") );
	headerLayout.AddChild( createHeader("Value") );
	headerLayout.SetBackColor( black );
	
	lay.AddChild(headerLayout);
	
	controls = app.CreateLayout("linear", "Horizontal,FillX");
	
	add = app.CreateButton( "[fa-plus]", 1/3, 0.05, "FontAwesome" );
	add.SetOnTouch( createRow );
	add.SetBackColor( green );
	add.SetTextSize( 32 );
	
	del = app.CreateButton( "[fa-trash]", 1/3, 0.05, "FontAwesome" );
	del.SetOnTouch( deleteRow );
	del.SetBackColor( red );
	del.SetTextSize( 32 );
	
	ply = app.CreateButton( "[fa-play]", 1/3, 0.05, "FontAwesome" );
	ply.SetOnTouch( loadIntoMemory );
	ply.SetBackColor( blue );
	ply.SetTextSize( 32 );
	
	controls.AddChild( add );
	controls.AddChild( del );
	controls.AddChild( ply );

    lay.AddChild( controls );
    
    scroller = app.CreateScroller(1, 1-( headerLayout.GetHeight() + controls.GetHeight() ));
    main = app.CreateLayout("Linear", "FillX");
    scroller.AddChild( main );
    
    lay.AddChild( scroller );

	//Add layout to app.	
	app.AddLayout( lay );
}

function precachePopups() {
    //Opcode
    opcodepopup = app.CreateDialog( "", "NoTitle" );
    opcodelayout = app.CreateLayout( "Linear" );
    opcodelayout.SetSize( 0.9, -1 );
    opcodelayout.SetBackColor( white );
    opcodepopup.AddLayout( opcodelayout );
    
    opcodeheaderlayout = app.CreateLayout( "Linear", "VCenter" );
    opcodeheaderlayout.SetBackColor( grey );
    opcodeheaderlayout.SetSize( 0.9, -1 );
    opcodeheaderlayout.SetPadding( 0, 0.02, 0, 0.02 );
    opcodeheadertext = app.CreateText( "Choose Opcode", 0.9, -1 );
    opcodeheadertext.SetTextSize( 22 );
    opcodeheadertext.SetTextColor( black );
    opcodeheaderlayout.AddChild( opcodeheadertext );
    
    var list = app.CreateList( ["ADD", "SUB", "STA", "LDA", "BRA", "BRZ", "BRP", "INP", "OUT", "HLT", "DAT"], 0.9, 0.5 );
    list.SetTextColor(black);
    list.SetOnTouch( chosenOpcode );
    
    opcodelayout.AddChild( opcodeheaderlayout );
    opcodelayout.AddChild( list );
}

function chooseOpcode() {
    opcodepopup.Show();
    currentPopup = opcodepopup;
}

function chosenOpcode( opcode ) {
    app.GetLastButton().SetText( opcode );
    currentPopup.Hide();
}

function createDialog(title, content) {
    opcodepopup.Show();
}

function createHeader(text) {
    var txt = app.CreateText(text, (1/3), -1);
    txt.SetTextColor(white);
    return txt;
}

function createRow() {
    var vWrapper = app.CreateLayout("linear", "FillX");
    var hWrapper = app.CreateLayout("linear", "FillX,Horizontal");
    
    var label = app.CreateTextEdit("", (1/3), -1, "Singleline");
    label.SetBackColor(grey);
    label.SetTextColor(black);
    
    var opcode = app.CreateButton("Select...", (1/3), label.GetHeight());
    opcode.SetBackColor(white);
    opcode.SetTextColor(black);
    opcode.SetTextSize( label.GetTextSize() );
    opcode.SetOnTouch( chooseOpcode );
    
    var value = app.CreateTextEdit("", (1/3), -1);
    value.SetBackColor(grey);
    value.SetTextColor(black);
    
    commands[0].push( label );
    commands[1].push( opcode );
    commands[2].push( value );
    commands[3].push( vWrapper );
    
    vWrapper.AddChild( createSpacer() );
    hWrapper.AddChild(label);
    hWrapper.AddChild(opcode);
    hWrapper.AddChild(value);
    vWrapper.AddChild( hWrapper );
    main.AddChild(vWrapper);
}

function deleteRow() {
    if( commands[0].length > 0 ) {
        var wrapper = commands[3][commands[3].length-1];
        for( i=0; i < 4; i++) commands[i].pop();
        main.DestroyChild( wrapper );
    }
}

function createSpacer() {
    var spacer = app.CreateText("", 1, 0.001);
    spacer.SetPadding(0,0,0,0);
    spacer.SetBackColor(black);
    return spacer;
}

function parseInstructions() {
    accumulator = 0;
    memoryBlocks = [0, 0, 0, 0, 0, 0, 0, 0];
    memoryBlockMap = {};
    //Allocate Memory Blocks
    for( i=0; i<commands[0].length; i++ ) {
        if( commands[1][i].GetText() == "DAT" ) {
            var map = commands[0][i].GetText();
            memoryBlockMap[map] = Object.keys(memoryBlockMap).length;
            //memoryBlockMap[commands[0][i]] = memoryBlockMap.length-1;
            memoryBlocks[ memoryBlockMap[map] ] = parseInt(commands[2][i].GetText());
        }
    }
    
    for( i=0; i<commands[0].length; i++ ) {
        if( commands[1][i].GetText() == "ADD" ) {
            var val = 0;
            var rawVal = commands[2][i].GetText();
            if( Object.keys(memoryBlockMap).contains( rawVal ) ) val = memoryBlocks[ memoryBlockMap[ rawVal ] ];
            else val = parseInt( rawVal );
            accumulator += val;
        }
    }
    
    for( i=0; i<commands[0].length; i++ ) {
        if( commands[1][i].GetText() == "SUB" ) {
            var val = 0;
            var rawVal = commands[2][i].GetText();
            if( Object.keys(memoryBlockMap).contains( rawVal ) ) val = memoryBlocks[ memoryBlockMap[ rawVal ] ];
            else val = parseInt( rawVal );
            accumulator -= val;
        }
    }
    
    for( i=0; i<commands[0].length; i++ ) {
        if( commands[1][i].GetText() == "ADD" ) {
            var val = 0;
            var rawVal = commands[2][i].GetText();
            if( Object.keys(memoryBlockMap).contains( rawVal ) ) val = memoryBlocks[ memoryBlockMap[ rawVal ] ];
            else val = parseInt( rawVal );
            accumulator += val;
        }
    }
    
    alert( memoryBlocks );
    alert( accumulator );
}

function loadIntoMemory() {
    //Reset registers to initial state
    accumulator = 0;
    programCounter = 0;
    memoryAddressRegister = 0;
    memoryDataRegister = 0;
    memory = [[], [], []];
    memoryBlocks = [0, 0, 0, 0, 0, 0, 0, 0];
    memoryBlockMap = {};
    
    for( i=0; i<commands[0].length; i++ ) {
        if( commands[1][i].GetText() == "DAT" ) {
            var map = commands[0][i].GetText();
            memoryBlockMap[map] = Object.keys(memoryBlockMap).length;
            memoryBlocks[ memoryBlockMap[map] ] = parseInt(commands[2][i].GetText()) || 0;
        } else {
            //Label
            memory[0].push(commands[0][i].GetText());
            //Opcode
            memory[1].push(commands[1][i].GetText());
            //Operand
            memory[2].push(commands[2][i].GetText());
        }
    }
    fdeCycle();
}

function processInstruction( instruction /* instruction = [lbl,opc,opr] */ ) {
    //If label is empty, (is an actual instruction)
    switch( instruction[1] ) {
        case "ADD":
            accumulator += getData( instruction[2] );
            break;
        case "SUB":
            accumulator -= getData( instruction[2] );
            break;
        case "STA":
            memoryBlocks[ getBlock( instruction[2] ) ] = accumulator;
            break;
        case "LDA":
            accumulator = memoryBlocks[ getBlock( instruction[2] ) ];
            break;
        case "BRA":
            programCounter = memory[0].indexOf( instruction[2] );
            break;
        case "BRZ":
            if( accumulator == 0 ) programCounter = memory[0].indexOf( instruction[2] );
            break;
        case "BRP":
            if( accumulator > 0 ) programCounter = memory[0].indexOf( instruction[2] );
            break;
        case "INP":
            accumulator = parseInt( prompt("Enter value:") );
            break;
        case "OUT":
            alert( accumulator );
            break;
        case "HTL":
            break;
    }
}

function fdeCycle() {
    //Copy content of PC to MAR
    memoryAddressRegister = programCounter;
    //Increment PC to next instruction
    programCounter++;
    //Fetch instruction to MDR using content of MAR
    memoryDataRegister = [memory[0][memoryAddressRegister], memory[1][memoryAddressRegister], memory[2][memoryAddressRegister]];
    //Instruction copied to CIR
    currentInstructionRegister = memoryDataRegister;
    //Decoded and executed
    processInstruction( currentInstructionRegister );
    if( currentInstructionRegister[1] != "HLT" && programCounter <= memory[0].length - 1) fdeCycle();
}

function getData( operand ) {
    if( Object.keys(memoryBlockMap).contains( operand ) ) {
        return memoryBlocks[ memoryBlockMap[operand] ];
    }
    return parseInt(operand);
}

function getBlock( map ) {
    return memoryBlockMap[map] || 0;
}

//Prototypes
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] == obj) return true;
    }
    return false;
}