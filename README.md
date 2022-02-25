# reactive-app

Build large scale applications supported by visual tools

## Develop

- Clone this repo
- `npm install`
- `npm run editor:watch` watches the editor electron app
- `npm run editor:dev` runs the client dev server
- Updates to runtime library requires `npm run build`

To use in an app `npm link reactive-app` in the app repo and add a script:

```json
{
	"scripts": {
		"editor": "node ../reactive-app/bin-dev
	}
}
```

**NOTE!** The default app directory is `src/app`, you can use an
env variables, `APP_DIR`, to change that. For example:

```json
{
	"scripts": {
		"editor": "APP_DIR=app node ../reactive-app/bin-dev
	}
}
```
