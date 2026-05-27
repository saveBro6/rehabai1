update public.products
set category = case category
  when 'Dung cu tap tay' then 'Dụng cụ tập tay'
  when 'Day khang luc' then 'Dây kháng lực'
  when 'Khung tap di' then 'Khung tập đi'
  when 'Bong tap phuc hoi' then 'Bóng tập phục hồi'
  when 'Dung cu tap chan' then 'Dụng cụ tập chân'
  when 'Ghe ho tro' then 'Ghế hỗ trợ'
  when 'Thiet bi theo doi suc khoe' then 'Thiết bị theo dõi sức khỏe'
  else category
end
where category in (
  'Dung cu tap tay',
  'Day khang luc',
  'Khung tap di',
  'Bong tap phuc hoi',
  'Dung cu tap chan',
  'Ghe ho tro',
  'Thiet bi theo doi suc khoe'
);
