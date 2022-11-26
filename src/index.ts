import _ from 'the-lodash';
import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';


const TERMINAL_LINE_CLEAR = "\u001b[2K";
const TERMINAL_CARET_RETURN ="\u001b[1G";
const TERMINAL_UNKNOWN_01 ="\u001b[?25h";
const TERMINAL_UNKNOWN_02 ="\u001b[?25l";


const program = new Command();

program
  .name('asciinema-time-director.git')
  .description('Slows down asciinema casts')
  .version('1.0.0');

program.command('slow-down')
  .description('Slows down asciinema casts')
  .requiredOption('--in <path>', 'input path')
  .requiredOption('--out <path>', 'output path')
  .action((options : {
    in: string,
    out: string,
  }) => {
    console.log("options: ", options);

    const contentsStr = readFileSync(options.in).toString();
    const lines = contentsStr.split('\n');
    const objects: any[] = [];

    for(const line of lines)
    {
      if (line.length > 0)
      {
        const obj = JSON.parse(line);
        objects.push(obj);
      }
    }

    const separatedObjects: any[] = [];
    for(const obj of objects)
    {
      if (_.isArray(obj))
      {
        if (obj[1] === 'o')
        {
          const parts = separateString(
            obj[2],
            [
              TERMINAL_LINE_CLEAR,
              TERMINAL_CARET_RETURN,
              TERMINAL_UNKNOWN_01,
              TERMINAL_UNKNOWN_02
            ]
          );
          for(const part of parts)
          {
            separatedObjects.push([obj[0], obj[1], part]);
          }
        }
      }
      else
      {
        separatedObjects.push(obj);
      }
    }

    // for(const obj of separatedObjects)
    // {
    //   console.log(obj);
    // }

    const newObjects : any[] = [];

    let origLastTime : number = 0;
    let procLastTime : number = 0;
    let isNormalLine : boolean = true;
    for(const lineObject of separatedObjects)
    {
      if (_.isArray(lineObject))
      {
        if (!shouldSkip(lineObject as any[])) {
          newObjects.push(convertLine(lineObject as any[]));
        }
      }
      else
      {
        newObjects.push(lineObject);
      }
    }

    const newContents = 
      newObjects.map(x => lineStringify(x))
      .join('\n');
    writeFileSync(options.out, newContents);

    function convertLine(lineObject: any[0]) : any[]
    {
      const time = lineObject[0] as number;
      const origDelta = time - origLastTime;
      origLastTime = time;

      const procDelta = decideDelta(lineObject[2] as string, origDelta);
      procLastTime = procLastTime + procDelta;

      return [
        procLastTime,
        lineObject[1],
        lineObject[2]
      ];
    }

    function decideDelta(line: string, origDelta: number) : number
    {
      if (line === TERMINAL_LINE_CLEAR) {
        isNormalLine = false;
        return Math.max(origDelta, 0.02);
      }
      if (line === TERMINAL_CARET_RETURN) {
        isNormalLine = false;
        return 0.001;
      }

      if (!isNormalLine) {
        if (line === TERMINAL_UNKNOWN_01 || 
            line === TERMINAL_UNKNOWN_02)
        {
            return 0.001;  
        }
      }

      if (!isNormalLine) {
        isNormalLine = true;
        return 0.001;  
      }

      isNormalLine = true;
      return Math.max(origDelta, 0.05);
    }

    function shouldSkip(lineObject: any[])
    {
      if (lineObject[2].indexOf('Restored session:') !== -1) {
        return true;
      }
      return false;
    }
  });

program.parse();


function separateString(line: string, separators: string[]) : string[]
{
  for(const separator of separators)
  {
    const index = line.indexOf(separator);
    if (index !== -1)
    {
      return _.flatten([
        separateString(line.substring(0, index), separators),
        separator,
        separateString(line.substring(index + separator.length), separators)
      ]).filter(x => x.length > 0)
    }
  }

  return [line];
}

function lineStringify(lineObject: any) : string
{
  if (_.isArray(lineObject))
  {
    const arr = lineObject as any[];
    return `[${(arr[0] as number).toFixed(6)}, ${JSON.stringify(arr[1])}, ${JSON.stringify(arr[2])}]`
  }
  else
  {
    return JSON.stringify(lineObject);
  }
}