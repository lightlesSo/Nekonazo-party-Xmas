#lang racket
(require "public-defines.rkt")
#;(define (obs-hash hashtable fun proc)  ;大概要没用了  
  "hashtable在fun执行后如果变化，就执行proc"
  (define old-hash-code (equal-hash-code hashtable))
  (begin0 (fun)
         ; (display old-hash-code)
          (if (equal? old-hash-code (equal-hash-code hashtable))
              (void)
              (proc))))
(define (eq-hash-code-equal? hash1 hash2)
  (equal? (eq-hash-code hash1) (eq-hash-code hash2)))
(define not-obs-keys (list 'drawsteps))
(define (dif-hash old-hash new-hash)
  (define (dif old new)
    (define (dif-proc sub-old sub-new keys)
      (if (null? keys)
          #f ;每一次去掉一个kv相等的 最后为空就是全等， 不然直接返回new 这样是为了把比较过的去掉，减少重复
          ;问题是比较的并不同，不一定是值或者hash 需要判断
          (if (eq-hash-code-equal? (hash-ref sub-old (car keys))(hash-ref sub-new (car keys)))              
              (dif-proc (hash-remove sub-old (car keys)) (hash-remove sub-new (car keys)) (cdr keys))
              new)))
    (if (and (equal? (hash-count old)(hash-count new)) (hash-keys-subset? old new))
        (dif-proc old new (hash-keys old))
        new))

  (if (not (and (hash? new-hash) (hash? old-hash)))
      (if (eq? new-hash old-hash)
          '()
          new-hash)
      (let (( old-hash (hash-remove-list old-hash not-obs-keys))
            ( new-hash (hash-remove-list new-hash not-obs-keys)))
        (if (dif old-hash new-hash)
            new-hash
            (filter (lambda (x) (not (null? (cdr x))))
                    (hash-map new-hash (lambda (k v)
                                         (define ret (dif-hash (hash-ref old-hash k) (hash-ref new-hash k) ))
                                         (cons k ret) )))))))
(define (obs-hash get-hash fun proc)  
  " (get-hash) 因为是不可变 需要一个取得的方法
hashtable在满足条件后执行后如果变化，就执行(proc old new diflist)"
  ;甚至还可以调用自己，req携程ws步骤 内部都不用loop了， 不应该这样，混合过于严重，定时器方法和方法劫持不能携程一个函数吗
 ; 如果用法信号多线程方法，需要自己独立一个状态，保存之前的，为什么输入法只能输入第一个词 现在的方法也可以把sleep当req过程，单独里线程
  (define old-hash (get-hash))
  (begin0 (fun)
          (let ((dif-list (dif-hash old-hash (get-hash))))
            (if (null? dif-list)
                (void)
                (proc old-hash (get-hash) dif-list)))));不需要临时变量 大概 中途变了点问题也不大，而且这个步骤没有什么小号吧
#;(define (broadcast-if-room-status-modify fun)
  (define (broadcast)
    (define rooms-namelist 
      (filter string?
              (hash-map (name-status) 
                        (lambda (key value) 
                          (if (equal? "rooms" (hash-ref value 'state '()))
                              key
                              '())))))
    (define (oneroomstatus key value)
      (make-immutable-hash (list (cons 'room key) 
                       (cons 'peoplenum (length (hash-ref value 'names)))	  
                       (cons 'roomstatus (hash-ref value 'gamestate)))))
    (define roomsstatus (hash-map  (room-status) oneroomstatus))
    ;(display rooms-namelist)
    (broadcast-json rooms-namelist "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus)) ))
  (obs-hash (room-status) fun broadcast))
(define (broadcast )
    (define rooms-namelist 
      (filter string?
              (hash-map (name-status) 
                        (lambda (key value) 
                          (if (equal? "rooms" (hash-ref value 'state '()))
                              key
                              '())))))
    (define (oneroomstatus key value)
      (make-immutable-hash (list (cons 'room key) 
                       (cons 'peoplenum (length (hash-ref value 'names)))	  
                       (cons 'roomstatus (hash-ref value 'gamestate)))))
    (define roomsstatus (hash-map  (room-status) oneroomstatus))
    ;(display rooms-namelist)
    (broadcast-json rooms-namelist "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus)) ))
(define (obs fun)
  (define (obs-proc old-hash new-hash dif-list)
    (displayln dif-list)
    (broadcast))
  (obs-hash root fun obs-proc))
(provide obs)