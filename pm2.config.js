module.exports = {
  apps : [
    {
      name      : 'submission',
      script    : "server/bin/www",
      instances : "1",
      exec_mode : "fork"
    }
  ]
}