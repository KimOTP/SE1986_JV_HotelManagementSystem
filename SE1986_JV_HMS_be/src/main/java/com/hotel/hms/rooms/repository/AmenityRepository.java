package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.entity.Amenity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface AmenityRepository extends JpaRepository<Amenity, Long> {
    List<Amenity> findAllByOrderByNameAsc();

    @Query("select distinct a from CatalogRoomType t join t.amenities a "
            + "where t.hotelId = :hotelId and t.active = true order by a.name")
    List<Amenity> findPublicCatalog(@Param("hotelId") long hotelId);

    @Query(value = "SELECT is_active FROM inventory.amenities WITH (UPDLOCK,HOLDLOCK) WHERE amenity_id=:id", nativeQuery = true)
    List<Boolean> findActivityForUpdate(@Param("id") long id);
}
