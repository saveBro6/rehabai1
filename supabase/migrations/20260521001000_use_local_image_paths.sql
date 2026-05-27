update public.doctors
set avatar_url = case id
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then '/images/doctors/le-minh-khoa.jpg'
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then '/images/doctors/nguyen-ha-my.jpg'
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' then '/images/doctors/pham-duc-tri.jpg'
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4' then '/images/doctors/vo-anh-thu.jpg'
  when 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5' then '/images/doctors/hoang-ngoc-lan.jpg'
  else avatar_url
end
where id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
);

update public.products
set image_url = case id
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' then '/images/products/hand-grip.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2' then '/images/products/resistance-band.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3' then '/images/products/walker.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4' then '/images/products/therapy-ball.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5' then '/images/products/pedal-trainer.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6' then '/images/products/shower-chair.jpg'
  when 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7' then '/images/products/blood-pressure-monitor.jpg'
  else image_url
end
where id in (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7'
);

update public.exercises
set image_url = case slug
  when 'nang-tay-thu-dong' then '/images/exercises/passive-arm-raise.jpg'
  when 'nam-mo-ban-tay' then '/images/exercises/hand-open-close.jpg'
  when 'duoi-co-tay' then '/images/exercises/wrist-stretch.jpg'
  when 'nang-chan-khi-ngoi' then '/images/exercises/seated-leg-raise.jpg'
  when 'tap-dung-len-ngoi-xuong' then '/images/exercises/sit-to-stand.jpg'
  when 'tap-giu-thang-bang' then '/images/exercises/balance-training.jpg'
  when 'buoc-ngang-co-ho-tro' then '/images/exercises/supported-side-step.jpg'
  when 'keo-gian-vai' then '/images/exercises/shoulder-stretch.jpg'
  when 'gap-duoi-goi' then '/images/exercises/knee-flexion-extension.jpg'
  when 'tap-phoi-hop-tay-mat' then '/images/exercises/hand-eye-coordination.jpg'
  else image_url
end
where slug in (
  'nang-tay-thu-dong',
  'nam-mo-ban-tay',
  'duoi-co-tay',
  'nang-chan-khi-ngoi',
  'tap-dung-len-ngoi-xuong',
  'tap-giu-thang-bang',
  'buoc-ngang-co-ho-tro',
  'keo-gian-vai',
  'gap-duoi-goi',
  'tap-phoi-hop-tay-mat'
);
