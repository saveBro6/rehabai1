update public.products as product
set
  name = data.name,
  description = data.description,
  category = data.category
from (
  values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'::uuid, 'Bộ bóng mềm tập nắm tay', 'Dụng cụ tập lực nắm và vận động bàn tay cho người cần phục hồi sau đột quỵ.', 'Dụng cụ tập tay'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'::uuid, 'Dây kéo kháng lực RehabAI', 'Dây kháng lực nhiều mức độ cho bài tập tay, vai và chân.', 'Dây kháng lực'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'::uuid, 'Khung tập đi gấp gọn', 'Hỗ trợ người bệnh tập đi an toàn trong quá trình tập luyện có giám sát.', 'Khung tập đi'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'::uuid, 'Bóng tập phục hồi 55cm', 'Bóng tập giúp cải thiện thăng bằng, sức mạnh thân mình và độ linh hoạt.', 'Bóng tập phục hồi'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb5'::uuid, 'Bàn đạp tập chân tại nhà', 'Dụng cụ tập chân nhỏ gọn cho người cần cải thiện tầm vận động.', 'Dụng cụ tập chân'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb6'::uuid, 'Ghế tắm hỗ trợ an toàn', 'Ghế chống trượt hỗ trợ sinh hoạt hằng ngày cho người cao tuổi và người yếu vận động.', 'Ghế hỗ trợ'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb7'::uuid, 'Máy đo huyết áp điện tử', 'Thiết bị theo dõi sức khỏe tại nhà, phù hợp với người cần quan sát chỉ số định kỳ.', 'Thiết bị theo dõi sức khỏe')
) as data(id, name, description, category)
where product.id = data.id;

update public.exercises as exercise
set
  title = data.title,
  description = data.description,
  instructions = data.instructions,
  precautions = data.precautions
from (
  values
    ('nang-tay-thu-dong', 'Nâng tay thụ động', 'Bài tập nhẹ giúp duy trì tầm vận động vai và cánh tay sau đột quỵ.', array['Ngồi thẳng lưng trên ghế chắc chắn.', 'Dùng tay lành nâng nhẹ tay yếu lên phía trước.', 'Giữ 2 giây rồi hạ chậm về vị trí ban đầu.'], array['Không kéo quá tầm vận động gây đau.', 'Nên có người nhà hỗ trợ nếu khả năng giữ thăng bằng kém.']),
    ('nam-mo-ban-tay', 'Nắm mở bàn tay', 'Cải thiện khả năng chủ động của ngón tay và bàn tay.', array['Đặt cẳng tay lên bàn.', 'Nắm bàn tay chậm rãi.', 'Mở từng ngón tay hết mức có thể.'], array['Dừng lại nếu có co thắt hoặc đau tăng nhanh.']),
    ('duoi-co-tay', 'Duỗi cổ tay', 'Kéo giãn nhẹ nhóm cơ gấp cổ tay, phù hợp với người bị cứng cơ.', array['Đưa cánh tay ra trước.', 'Dùng tay còn lại kéo nhẹ bàn tay về phía sau.', 'Giữ 10 giây và thở đều.'], array['Không giật mạnh cổ tay.', 'Nếu tê lan xuống ngón tay, dừng tập.']),
    ('nang-chan-khi-ngoi', 'Nâng chân khi ngồi', 'Tăng sức mạnh đùi trước và khả năng kiểm soát chân khi ngồi.', array['Ngồi trên ghế, hai chân chạm sàn.', 'Duỗi một chân về phía trước đến khi gối gần thẳng.', 'Hạ chân chậm và đổi bên.'], array['Giữ lưng thẳng, không ngả người ra sau.']),
    ('tap-dung-len-ngoi-xuong', 'Tập đứng lên ngồi xuống', 'Hỗ trợ khả năng độc lập trong sinh hoạt hằng ngày.', array['Ngồi sát mép ghế chắc chắn.', 'Đặt hai chân rộng bằng vai.', 'Đẩy người đứng lên rồi ngồi xuống chậm rãi.'], array['Cần có tay vịn hoặc người hỗ trợ nếu thăng bằng chưa tốt.']),
    ('tap-giu-thang-bang', 'Tập giữ thăng bằng', 'Rèn luyện thăng bằng tĩnh để giảm nguy cơ té ngã.', array['Đứng gần mặt bàn hoặc tay vịn.', 'Giữ hai chân rộng bằng hông.', 'Giữ tư thế 20-30 giây và thở đều.'], array['Luôn tập gần điểm bám chắc chắn.', 'Dừng ngay nếu chóng mặt.']),
    ('buoc-ngang-co-ho-tro', 'Bước ngang có hỗ trợ', 'Cải thiện khả năng di chuyển ngang và kiểm soát hông.', array['Đứng cạnh tay vịn.', 'Bước một chân sang ngang.', 'Kéo chân còn lại về gần và lặp lại.'], array['Không tập khi sàn trơn.', 'Cần người giám sát nếu từng té ngã gần đây.']),
    ('keo-gian-vai', 'Kéo giãn vai', 'Giảm căng cứng vùng vai và cải thiện tầm vận động.', array['Đưa tay ngang ngực.', 'Dùng tay còn lại kéo nhẹ cánh tay về phía thân mình.', 'Giữ 10 giây mỗi lần.'], array['Không ép vai nếu có đau nhói.']),
    ('gap-duoi-goi', 'Gập duỗi gối', 'Hỗ trợ tầm vận động khớp gối sau chấn thương hoặc phẫu thuật.', array['Ngồi hoặc nằm với chân duỗi thoải mái.', 'Gập gối chậm rãi trong mức không đau.', 'Duỗi chân về vị trí ban đầu.'], array['Tuân thủ giới hạn vận động nếu mới phẫu thuật.']),
    ('tap-phoi-hop-tay-mat', 'Tập phối hợp tay mắt', 'Rèn khả năng điều khiển động tác và phối hợp sau đột quỵ.', array['Đặt các vật nhỏ trên bàn.', 'Chạm lần lượt từng vật bằng ngón trỏ.', 'Tăng tốc độ khi kiểm soát tốt hơn.'], array['Bắt đầu chậm, ưu tiên chính xác hơn tốc độ.'])
) as data(slug, title, description, instructions, precautions)
where exercise.slug = data.slug;
