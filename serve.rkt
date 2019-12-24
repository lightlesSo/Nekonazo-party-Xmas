#lang racket
;include-template
(require (file "web-server/ws.rkt"))
(require (file "web-server/public-defines.rkt"));test yong
(define ws-serve? (make-parameter #f))
(define file-serve? (make-parameter #f))
(define ws-port (make-parameter 8081))
(define static-port (make-parameter 80))
(define file-path (make-parameter "partyx"))
(command-line
 #:usage-help "run with -f  and -w  if there is no option"
 #:once-each
 (("-f" "--file-serve") 
  "run file-server"
  (file-serve? #t))  
 (("-w" "--ws-serve")  
  "run ws-server"                    
  (ws-serve? #t) 
  )
 (("-i" "--file-port") port "file-server port; 80 is default"
                       (static-port (string->number port)))
 (("-p" "--ws-port") port "ws-server port; 8081 is default"
                     (ws-port (string->number port))                           )
 (("-s" "--static-path") path "static-file-path ; partyx is default"
                         (file-path path))
 #:args()
 (begin 
   (if (or (file-serve?)(ws-serve?))
       '()
       (begin (file-serve? #t)
              (ws-serve? #t)))
    ;'()!= void huixianshi 
   (if (ws-serve?)
       (begin(with-handlers ((exn:fail? (lambda(e) (void)))) (with-output-to-file (string-append (file-path) "/config.js")
                                                               (lambda()(printf "const WS_PORT=~a; \n" (ws-port))) #:exists 'must-truncate))
             (websocket-serve (ws-port) (static-port))
             (printf "ws-server is running at ~a\n" (ws-port)))
       (void))
   (if (file-serve?)
       (begin (static-serve (static-port) (file-path))
              (printf "file-server is running at ~a \n application is available at localhost:~a/Nekonazo%20partyx.html \n" (static-port)(static-port)))
       (void))
    ;(read-eval-print-loop) 获取不到环境
   (define (repl r)
     (case r
       ((name-status) (displayln name-status))
       ((room-status) (displayln room-status))
       ((ws-pool) (displayln ws-pool)))
     (repl (read)))
   (repl (read)) ;or
  ; "test-mode"
   ))