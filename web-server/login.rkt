#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt")

(define (get-anonymous-name)
  (define (proc n)
    (let ((name  (string-append "anonymous" (~a n))))
      (if (hash-has-key? (ws-pool) (string->symbol name))
          (proc (+ n 1))
          name)))
  (proc 1))

(define (login client content) 
  "return name"
  (let ((name (string->symbol (if (equal? "anonymous" (hash-ref content 'name))
				(get-anonymous-name)
				(hash-ref content 'name)))))
            
          (if (or (hash-has-key? (ws-pool) name) (equal? name (string->symbol "")) (not (symbol? name)))
              (begin(if(or (equal? name (string->symbol "")) (not (symbol? name)))
                       (ws-send! client (jsexpr->string
                                         `#hasheq((type . "account")
                                                  (type2 . "login")
                                                  (content . #hasheq((name . ,(symbol->string name))
                                                                     (status . "nullname"))))))
                       (ws-send! client (jsexpr->string
                                         `#hasheq((type . "account")
                                                  (type2 . "login")
                                                  (content . #hasheq((name . ,(symbol->string name))
                                                                     (status . "duplicate")))))))
                    (ws-close! client)
                   )
              (begin (lock-ws-pool (thunk (ws-pool (hash-set (ws-pool) name client))))
                     (lock-name-status (thunk (name-status name (hasheq 'state  "rooms" 'sema (make-semaphore 1)))))
                   (ws-send! client (jsexpr->string
                                     `#hasheq((type . "account")
                                              (type2 . "login")
                                              (content . #hasheq((name . ,(symbol->string name))
                                                                 (status . "ok"))))))
                   name))))
(provide login)