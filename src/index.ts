import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
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

    const newLines : string[] = [];

    let origLastTime : number = 0;
    let procLastTime : number = 0;
    let isNormalLine : boolean = true;
    for(const line of lines)
    {
      if (!shouldSkip(line)) {
        newLines.push(convertLine(line));
      }
    }

    const newContents = newLines.join('\n');
    writeFileSync(options.out, newContents);

    function convertLine(line: string)
    {
      if (line.startsWith('['))
      {
        const commaIndex = line.indexOf(',');
        if (commaIndex !== -1)
        {
          const timeStr = line.substring(1, commaIndex);
          const time = parseFloat(timeStr);
          const origDelta = time - origLastTime;
          origLastTime = time;

          const procDelta = decideDelta(line, origDelta);
          procLastTime = procLastTime + procDelta;

          line = `[${procLastTime.toFixed(6)}${line.substring(commaIndex)}`;
        }
      }
      return line;
    }

    function decideDelta(line: string, origDelta: number)
    {
      if (line.indexOf('[2K') !== -1) {
        isNormalLine = false;
        return Math.max(origDelta, 0.02);
      }
      if (line.indexOf('[1G') !== -1) {
        isNormalLine = false;
        return origDelta;
      }

      if (!isNormalLine) {
        isNormalLine = true;  
        return origDelta;
      }

      isNormalLine = true;
      return Math.max(origDelta, 0.05);
    }

    function shouldSkip(line: string)
    {
      if (line.indexOf('Restored session:') !== -1) {
        return true;
      }
      return false;
    }
  });

program.parse();


