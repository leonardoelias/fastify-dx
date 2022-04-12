
import { fileURLToPath } from 'node:url'
import chokidar from 'chokidar'
import kleur from 'kleur'

export default async ({ path, $, quiet, startDevLogger }) => {
  let isRestart = false
  let node

  watch()

  await start({ $, quiet, startDevLogger })

  async function start () {
    node = getNode()

    startDevLogger(node.stdout, 'debug')
    startDevLogger(node.stderr, 'error')

    try {
      await node
    } catch {
      if (isRestart) {
        isRestart = false
      } else {
        setImmediate(() => process.exit(1))
      }
    }
  }

  function restart () {
    isRestart = true
    node.catch(() => start())
    node.kill()
  }

  function getNode () {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const listenPath = path.resolve(__dirname, '..', 'listen.mjs')
    return quiet($`${
      process.argv[0]
    } ${
      listenPath
    } ${
      process.argv.slice(2).map(arg => $.originalQuote(arg)).join(' ')
    }`)
  }

  function watch () {
    const watcher = chokidar.watch(['*.mjs', '*.js', '**/.mjs', '**/.js'], {
      ignoreInitial: true,
      ignored: ['**/node_modules/**'],
    })
    const changed = reason => (path) => {
      console.log()
      console.log(`${reason} ${path.replace(process.cwd(), '')}`)
      console.log()
      restart()
    }
    watcher.on('add', changed(kleur.green('A')))
    watcher.on('unlink', changed(kleur.red('D')))
    watcher.on('change', changed(kleur.yellow('M')))
  }
}
