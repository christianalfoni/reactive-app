#!/usr/bin/env node

const { spawn } = require('child_process')
const electron = require('electron')
const path = require('path')

const editorPath = path.join(__dirname, 'editor/out/index.js')

const args = [editorPath]
  .concat([].concat(process.argv).splice(2))
  .concat('--not-packaged=true')

const env = Object.create(process.env)
env.NODE_ENV = 'development'

const proc = spawn(electron, args, { stdio: 'inherit', env })
proc.on('close', (code) => {
  process.exit(code)
})
